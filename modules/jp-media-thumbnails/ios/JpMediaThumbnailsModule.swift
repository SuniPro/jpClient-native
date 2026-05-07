import ExpoModulesCore
import Photos
import UIKit

public class JpMediaThumbnailsModule: Module {
  private let imageManager = PHCachingImageManager()

  // MARK: - In-memory caches
  private var fastMemoryCache: [String: String] = [:]
  private var highMemoryCache: [String: String] = [:]

  // MARK: - In-flight guards
  private var fastLoadingIds = Set<String>()
  private var highLoadingIds = Set<String>()

  // MARK: - Pending completion fan-out
  private var fastPendingCompletions: [String: [(String?) -> Void]] = [:]
  private var highPendingCompletions: [String: [(String?) -> Void]] = [:]

  // MARK: - Preload engine state
  private var preloadAssetIds: [String] = []

  private var preloadWidth: CGFloat = 200
  private var preloadHeight: CGFloat = 200

  private var preloadFastBatchSize = 48
  private var preloadHighBatchSize = 12

  private var preloadFastIndex = 0
  private var preloadHighIndex = 0

  private var isPreloadingFast = false
  private var isPreloadingHigh = false
  private var shouldStopPreloading = false

  // MARK: - Preheat tracking
  private var lastPreheatedFastIds: [String] = []
  private var lastPreheatedHighIds: [String] = []

  public func definition() -> ModuleDefinition {
    Name("JpMediaThumbnails")

    AsyncFunction("getThumbnail") { (assetId: String, options: [String: Any], promise: Promise) in
      let width = (options["width"] as? Double).map { CGFloat($0) } ?? 200
      let height = (options["height"] as? Double).map { CGFloat($0) } ?? 200
      let quality = (options["quality"] as? String) ?? "fast"

      self.requestThumbnail(
        assetId: assetId,
        width: width,
        height: height,
        quality: quality
      ) { uri in
        promise.resolve(uri)
      }
    }

    AsyncFunction("getThumbnailBatch") { (assetIds: [String], options: [String: Any], promise: Promise) in
      let width = (options["width"] as? Double).map { CGFloat($0) } ?? 200
      let height = (options["height"] as? Double).map { CGFloat($0) } ?? 200
      let quality = (options["quality"] as? String) ?? "fast"

      if assetIds.isEmpty {
        promise.resolve([String: String?]())
        return
      }

      var results: [String: String?] = [:]
      let group = DispatchGroup()

      for assetId in assetIds {
        group.enter()

        self.requestThumbnail(
          assetId: assetId,
          width: width,
          height: height,
          quality: quality
        ) { uri in
          results[assetId] = uri
          group.leave()
        }
      }

      group.notify(queue: .main) {
        promise.resolve(results)
      }
    }

    AsyncFunction("getCachedThumbnail") { (assetId: String, options: [String: Any], promise: Promise) in
      let width = (options["width"] as? Double).map { CGFloat($0) } ?? 200
      let height = (options["height"] as? Double).map { CGFloat($0) } ?? 200
      let quality = (options["quality"] as? String) ?? "fast"
      let scale = UIScreen.main.scale

      let cacheKey = self.makeMemoryCacheKey(
        assetId: assetId,
        width: width,
        height: height,
        scale: scale,
        quality: quality
      )

      if let memoryUri = self.getMemoryCachedUri(for: cacheKey, quality: quality) {
        promise.resolve(memoryUri)
        return
      }

      do {
        let fileURL = try self.makeCacheFileURL(
          assetId: assetId,
          width: width,
          height: height,
          scale: scale,
          quality: quality
        )

        if FileManager.default.fileExists(atPath: fileURL.path) {
          let uri = fileURL.absoluteString
          self.setMemoryCachedUri(uri, for: cacheKey, quality: quality)
          promise.resolve(uri)
          return
        }

        promise.resolve(nil)
      } catch {
        promise.resolve(nil)
      }
    }

    AsyncFunction("startPreloading") { (assetIds: [String], options: [String: Any], promise: Promise) in
      let width = (options["width"] as? Double).map { CGFloat($0) } ?? 200
      let height = (options["height"] as? Double).map { CGFloat($0) } ?? 200
      let fastBatchSize = options["fastBatchSize"] as? Int ?? 48
      let highBatchSize = options["highBatchSize"] as? Int ?? 12

      self.startPreloading(
        assetIds: assetIds,
        width: width,
        height: height,
        fastBatchSize: fastBatchSize,
        highBatchSize: highBatchSize
      )

      promise.resolve(nil)
    }

    Function("stopPreloading") {
      self.stopPreloading()
    }
  }

  // MARK: - Cache helpers

  private func makeSafeAssetId(_ assetId: String) -> String {
    return assetId
      .replacingOccurrences(of: "/", with: "_")
      .replacingOccurrences(of: ":", with: "_")
      .replacingOccurrences(of: " ", with: "_")
  }

  private func makeMemoryCacheKey(
    assetId: String,
    width: CGFloat,
    height: CGFloat,
    scale: CGFloat,
    quality: String
  ) -> String {
    return "\(assetId)_\(Int(width))x\(Int(height))@\(Int(scale))x_\(quality)"
  }

  private func makeCacheFileURL(
    assetId: String,
    width: CGFloat,
    height: CGFloat,
    scale: CGFloat,
    quality: String
  ) throws -> URL {
    let cacheDir = FileManager.default.temporaryDirectory
      .appendingPathComponent("jp-media-thumbnails", isDirectory: true)

    try FileManager.default.createDirectory(
      at: cacheDir,
      withIntermediateDirectories: true
    )

    let safeAssetId = makeSafeAssetId(assetId)

    return cacheDir.appendingPathComponent(
      "\(safeAssetId)_\(Int(width))x\(Int(height))@\(Int(scale))x_\(quality).jpg"
    )
  }

  private func getMemoryCachedUri(for key: String, quality: String) -> String? {
    if quality == "high" {
      return highMemoryCache[key]
    }

    return fastMemoryCache[key]
  }

  private func setMemoryCachedUri(_ uri: String, for key: String, quality: String) {
    if quality == "high" {
      highMemoryCache[key] = uri
    } else {
      fastMemoryCache[key] = uri
    }
  }

  private func isLoading(assetId: String, quality: String) -> Bool {
    if quality == "high" {
      return highLoadingIds.contains(assetId)
    }

    return fastLoadingIds.contains(assetId)
  }

  private func markLoading(assetId: String, quality: String) {
    if quality == "high" {
      highLoadingIds.insert(assetId)
    } else {
      fastLoadingIds.insert(assetId)
    }
  }

  private func unmarkLoading(assetId: String, quality: String) {
    if quality == "high" {
      highLoadingIds.remove(assetId)
    } else {
      fastLoadingIds.remove(assetId)
    }
  }

  // MARK: - Pending completion helpers

  private func appendPendingCompletion(
    assetId: String,
    quality: String,
    completion: @escaping (String?) -> Void
  ) {
    if quality == "high" {
      var current = highPendingCompletions[assetId] ?? []
      current.append(completion)
      highPendingCompletions[assetId] = current
    } else {
      var current = fastPendingCompletions[assetId] ?? []
      current.append(completion)
      fastPendingCompletions[assetId] = current
    }
  }

  private func resolvePendingCompletions(
    assetId: String,
    quality: String,
    uri: String?
  ) {
    let completions: [(String?) -> Void]

    if quality == "high" {
      completions = highPendingCompletions.removeValue(forKey: assetId) ?? []
    } else {
      completions = fastPendingCompletions.removeValue(forKey: assetId) ?? []
    }

    for completion in completions {
      completion(uri)
    }
  }

  // MARK: - Request engine

  private func requestThumbnail(
    assetId: String,
    width: CGFloat,
    height: CGFloat,
    quality: String,
    completion: @escaping (String?) -> Void
  ) {
    let scale = UIScreen.main.scale
    let cacheKey = makeMemoryCacheKey(
      assetId: assetId,
      width: width,
      height: height,
      scale: scale,
      quality: quality
    )

    // 1) Memory cache
    if let memoryUri = getMemoryCachedUri(for: cacheKey, quality: quality) {
      completion(memoryUri)
      return
    }

    let fileURL: URL
    do {
      fileURL = try makeCacheFileURL(
        assetId: assetId,
        width: width,
        height: height,
        scale: scale,
        quality: quality
      )
    } catch {
      print("[JpMediaThumbnails] failed to create cache file url: \(error.localizedDescription)")
      completion(nil)
      return
    }

    let fileUri = fileURL.absoluteString

    // 2) Disk cache
    if FileManager.default.fileExists(atPath: fileURL.path) {
      setMemoryCachedUri(fileUri, for: cacheKey, quality: quality)
      completion(fileUri)
      return
    }

    // 3) Fan-out duplicate requests
    if isLoading(assetId: assetId, quality: quality) {
      appendPendingCompletion(assetId: assetId, quality: quality, completion: completion)
      return
    }

    appendPendingCompletion(assetId: assetId, quality: quality, completion: completion)
    markLoading(assetId: assetId, quality: quality)

    let fetchResult = PHAsset.fetchAssets(withLocalIdentifiers: [assetId], options: nil)
    guard let asset = fetchResult.firstObject else {
      unmarkLoading(assetId: assetId, quality: quality)
      resolvePendingCompletions(assetId: assetId, quality: quality, uri: nil)
      return
    }

    let requestOptions = PHImageRequestOptions()
    requestOptions.isSynchronous = false
    requestOptions.isNetworkAccessAllowed = true

    if quality == "high" {
      requestOptions.deliveryMode = .highQualityFormat
      requestOptions.resizeMode = .exact
    } else {
      requestOptions.deliveryMode = .fastFormat
      requestOptions.resizeMode = .fast
    }

    let targetSize = CGSize(width: width * scale, height: height * scale)

    imageManager.requestImage(
      for: asset,
      targetSize: targetSize,
      contentMode: .aspectFill,
      options: requestOptions
    ) { image, info in
      let isDegraded = (info?[PHImageResultIsDegradedKey] as? Bool) ?? false

      // high 품질은 degraded 이미지를 무시하고 최종 선명본만 저장
      if quality == "high" && isDegraded {
        return
      }

      defer {
        self.unmarkLoading(assetId: assetId, quality: quality)
      }

      guard let image else {
        self.resolvePendingCompletions(assetId: assetId, quality: quality, uri: nil)
        return
      }

      let compressionQuality: CGFloat = quality == "high" ? 0.9 : 0.72

      guard let data = image.jpegData(compressionQuality: compressionQuality) else {
        self.resolvePendingCompletions(assetId: assetId, quality: quality, uri: nil)
        return
      }

      do {
        try data.write(to: fileURL, options: .atomic)
        self.setMemoryCachedUri(fileUri, for: cacheKey, quality: quality)
        self.resolvePendingCompletions(assetId: assetId, quality: quality, uri: fileUri)
      } catch {
        print("[JpMediaThumbnails] failed to write thumbnail file: \(error.localizedDescription)")
        self.resolvePendingCompletions(assetId: assetId, quality: quality, uri: nil)
      }
    }
  }

  // MARK: - Photos preheat helpers

  private func fetchPHAssets(for assetIds: [String]) -> [PHAsset] {
    let fetchResult = PHAsset.fetchAssets(withLocalIdentifiers: assetIds, options: nil)

    var assets: [PHAsset] = []
    fetchResult.enumerateObjects { asset, _, _ in
      assets.append(asset)
    }
    return assets
  }

  private func startCaching(
    assetIds: [String],
    width: CGFloat,
    height: CGFloat,
    quality: String
  ) {
    let assets = fetchPHAssets(for: assetIds)
    if assets.isEmpty { return }

    let scale = UIScreen.main.scale
    let targetSize = CGSize(width: width * scale, height: height * scale)

    let options = PHImageRequestOptions()
    options.isSynchronous = false
    options.isNetworkAccessAllowed = true

    if quality == "high" {
      options.deliveryMode = .highQualityFormat
      options.resizeMode = .exact
    } else {
      options.deliveryMode = .fastFormat
      options.resizeMode = .fast
    }

    imageManager.startCachingImages(
      for: assets,
      targetSize: targetSize,
      contentMode: .aspectFill,
      options: options
    )
  }

  private func stopCaching(
    assetIds: [String],
    width: CGFloat,
    height: CGFloat,
    quality: String
  ) {
    let assets = fetchPHAssets(for: assetIds)
    if assets.isEmpty { return }

    let scale = UIScreen.main.scale
    let targetSize = CGSize(width: width * scale, height: height * scale)

    let options = PHImageRequestOptions()
    options.isSynchronous = false
    options.isNetworkAccessAllowed = true

    if quality == "high" {
      options.deliveryMode = .highQualityFormat
      options.resizeMode = .exact
    } else {
      options.deliveryMode = .fastFormat
      options.resizeMode = .fast
    }

    imageManager.stopCachingImages(
      for: assets,
      targetSize: targetSize,
      contentMode: .aspectFill,
      options: options
    )
  }

  // MARK: - Preload engine

  private func startPreloading(
    assetIds: [String],
    width: CGFloat,
    height: CGFloat,
    fastBatchSize: Int,
    highBatchSize: Int
  ) {
    preloadAssetIds = assetIds
    preloadWidth = width
    preloadHeight = height
    preloadFastBatchSize = max(1, fastBatchSize)
    preloadHighBatchSize = max(1, highBatchSize)

    preloadFastIndex = 0
    preloadHighIndex = 0

    shouldStopPreloading = false

    scheduleFastPreload()
    scheduleHighPreload()
  }

  private func stopPreloading() {
    shouldStopPreloading = true
    preloadAssetIds = []
    preloadFastIndex = 0
    preloadHighIndex = 0
    isPreloadingFast = false
    isPreloadingHigh = false

    if !lastPreheatedFastIds.isEmpty {
      stopCaching(
        assetIds: lastPreheatedFastIds,
        width: preloadWidth,
        height: preloadHeight,
        quality: "fast"
      )
      lastPreheatedFastIds = []
    }

    if !lastPreheatedHighIds.isEmpty {
      stopCaching(
        assetIds: lastPreheatedHighIds,
        width: preloadWidth,
        height: preloadHeight,
        quality: "high"
      )
      lastPreheatedHighIds = []
    }

    fastPendingCompletions.removeAll()
    highPendingCompletions.removeAll()
  }

  private func hasPendingFastPreload() -> Bool {
    for assetId in preloadAssetIds {
      let scale = UIScreen.main.scale
      let key = makeMemoryCacheKey(
        assetId: assetId,
        width: preloadWidth,
        height: preloadHeight,
        scale: scale,
        quality: "fast"
      )

      if getMemoryCachedUri(for: key, quality: "fast") != nil {
        continue
      }

      do {
        let fileURL = try makeCacheFileURL(
          assetId: assetId,
          width: preloadWidth,
          height: preloadHeight,
          scale: scale,
          quality: "fast"
        )

        if FileManager.default.fileExists(atPath: fileURL.path) {
          continue
        }
      } catch {
        // ignore
      }

      if !isLoading(assetId: assetId, quality: "fast") {
        return true
      }
    }

    return false
  }

  private func hasPendingHighPreload() -> Bool {
    for assetId in preloadAssetIds {
      let scale = UIScreen.main.scale

      let fastKey = makeMemoryCacheKey(
        assetId: assetId,
        width: preloadWidth,
        height: preloadHeight,
        scale: scale,
        quality: "fast"
      )

      let hasFastMemory = getMemoryCachedUri(for: fastKey, quality: "fast") != nil

      let hasFastDisk: Bool = {
        do {
          let url = try makeCacheFileURL(
            assetId: assetId,
            width: preloadWidth,
            height: preloadHeight,
            scale: scale,
            quality: "fast"
          )
          return FileManager.default.fileExists(atPath: url.path)
        } catch {
          return false
        }
      }()

      if !hasFastMemory && !hasFastDisk {
        continue
      }

      let highKey = makeMemoryCacheKey(
        assetId: assetId,
        width: preloadWidth,
        height: preloadHeight,
        scale: scale,
        quality: "high"
      )

      if getMemoryCachedUri(for: highKey, quality: "high") != nil {
        continue
      }

      do {
        let highURL = try makeCacheFileURL(
          assetId: assetId,
          width: preloadWidth,
          height: preloadHeight,
          scale: scale,
          quality: "high"
        )

        if FileManager.default.fileExists(atPath: highURL.path) {
          continue
        }
      } catch {
        // ignore
      }

      if !isLoading(assetId: assetId, quality: "high") {
        return true
      }
    }

    return false
  }

  private func scheduleFastPreload() {
    if shouldStopPreloading { return }
    if isPreloadingFast { return }
    if preloadAssetIds.isEmpty { return }

    isPreloadingFast = true

    DispatchQueue.global(qos: .userInitiated).asyncAfter(deadline: .now() + 0.05) {
      if self.shouldStopPreloading {
        self.isPreloadingFast = false
        return
      }

      let scale = UIScreen.main.scale
      var batchIds: [String] = []
      var index = self.preloadFastIndex

      while index < self.preloadAssetIds.count && batchIds.count < self.preloadFastBatchSize {
        let assetId = self.preloadAssetIds[index]
        index += 1

        let cacheKey = self.makeMemoryCacheKey(
          assetId: assetId,
          width: self.preloadWidth,
          height: self.preloadHeight,
          scale: scale,
          quality: "fast"
        )

        if self.getMemoryCachedUri(for: cacheKey, quality: "fast") != nil {
          continue
        }

        do {
          let fileURL = try self.makeCacheFileURL(
            assetId: assetId,
            width: self.preloadWidth,
            height: self.preloadHeight,
            scale: scale,
            quality: "fast"
          )

          if FileManager.default.fileExists(atPath: fileURL.path) {
            let uri = fileURL.absoluteString
            self.setMemoryCachedUri(uri, for: cacheKey, quality: "fast")
            continue
          }
        } catch {
          // ignore
        }

        if self.isLoading(assetId: assetId, quality: "fast") {
          continue
        }

        batchIds.append(assetId)
      }

      self.preloadFastIndex = index

      if self.preloadFastIndex >= self.preloadAssetIds.count {
        self.preloadFastIndex = 0
      }

      guard !batchIds.isEmpty else {
        self.isPreloadingFast = false

        if self.hasPendingFastPreload() {
          self.scheduleFastPreload()
        }

        return
      }

      let preheatIds = Array(batchIds.prefix(min(batchIds.count, 60)))

      if !self.lastPreheatedFastIds.isEmpty {
        self.stopCaching(
          assetIds: self.lastPreheatedFastIds,
          width: self.preloadWidth,
          height: self.preloadHeight,
          quality: "fast"
        )
      }

      self.startCaching(
        assetIds: preheatIds,
        width: self.preloadWidth,
        height: self.preloadHeight,
        quality: "fast"
      )

      self.lastPreheatedFastIds = preheatIds

      let dispatchGroup = DispatchGroup()

      for assetId in batchIds {
        dispatchGroup.enter()

        self.requestThumbnail(
          assetId: assetId,
          width: self.preloadWidth,
          height: self.preloadHeight,
          quality: "fast"
        ) { _ in
          dispatchGroup.leave()
        }
      }

      dispatchGroup.notify(queue: .main) {
        self.isPreloadingFast = false

        if self.hasPendingFastPreload() && !self.shouldStopPreloading {
          self.scheduleFastPreload()
        }
      }
    }
  }

  private func scheduleHighPreload() {
    if shouldStopPreloading { return }
    if isPreloadingHigh { return }
    if preloadAssetIds.isEmpty { return }

    isPreloadingHigh = true

    DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + 0.12) {
      if self.shouldStopPreloading {
        self.isPreloadingHigh = false
        return
      }

      let scale = UIScreen.main.scale
      var batchIds: [String] = []
      var index = self.preloadHighIndex

      while index < self.preloadAssetIds.count && batchIds.count < self.preloadHighBatchSize {
        let assetId = self.preloadAssetIds[index]
        index += 1

        let fastKey = self.makeMemoryCacheKey(
          assetId: assetId,
          width: self.preloadWidth,
          height: self.preloadHeight,
          scale: scale,
          quality: "fast"
        )

        let hasFastMemory = self.getMemoryCachedUri(for: fastKey, quality: "fast") != nil

        let hasFastDisk: Bool = {
          do {
            let url = try self.makeCacheFileURL(
              assetId: assetId,
              width: self.preloadWidth,
              height: self.preloadHeight,
              scale: scale,
              quality: "fast"
            )
            return FileManager.default.fileExists(atPath: url.path)
          } catch {
            return false
          }
        }()

        if !hasFastMemory && !hasFastDisk {
          continue
        }

        let highKey = self.makeMemoryCacheKey(
          assetId: assetId,
          width: self.preloadWidth,
          height: self.preloadHeight,
          scale: scale,
          quality: "high"
        )

        if self.getMemoryCachedUri(for: highKey, quality: "high") != nil {
          continue
        }

        do {
          let highURL = try self.makeCacheFileURL(
            assetId: assetId,
            width: self.preloadWidth,
            height: self.preloadHeight,
            scale: scale,
            quality: "high"
          )

          if FileManager.default.fileExists(atPath: highURL.path) {
            let uri = highURL.absoluteString
            self.setMemoryCachedUri(uri, for: highKey, quality: "high")
            continue
          }
        } catch {
          // ignore
        }

        if self.isLoading(assetId: assetId, quality: "high") {
          continue
        }

        batchIds.append(assetId)
      }

      self.preloadHighIndex = index

      if self.preloadHighIndex >= self.preloadAssetIds.count {
        self.preloadHighIndex = 0
      }

      guard !batchIds.isEmpty else {
        self.isPreloadingHigh = false

        if self.hasPendingHighPreload() {
          self.scheduleHighPreload()
        }

        return
      }

      let preheatIds = Array(batchIds.prefix(min(batchIds.count, 30)))

      if !self.lastPreheatedHighIds.isEmpty {
        self.stopCaching(
          assetIds: self.lastPreheatedHighIds,
          width: self.preloadWidth,
          height: self.preloadHeight,
          quality: "high"
        )
      }

      self.startCaching(
        assetIds: preheatIds,
        width: self.preloadWidth,
        height: self.preloadHeight,
        quality: "high"
      )

      self.lastPreheatedHighIds = preheatIds

      let dispatchGroup = DispatchGroup()

      for assetId in batchIds {
        dispatchGroup.enter()

        self.requestThumbnail(
          assetId: assetId,
          width: self.preloadWidth,
          height: self.preloadHeight,
          quality: "high"
        ) { _ in
          dispatchGroup.leave()
        }
      }

      dispatchGroup.notify(queue: .main) {
        self.isPreloadingHigh = false

        if self.hasPendingHighPreload() && !self.shouldStopPreloading {
          self.scheduleHighPreload()
        }
      }
    }
  }
}
