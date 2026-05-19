import ExpoModulesCore
import Photos
import UIKit

public class JpMediaThumbnailsModule: Module {
  private let imageManager = PHCachingImageManager()
  private let stateQueue = DispatchQueue(label: "jp.media.thumbnails.state")

  // MARK: - In-memory caches
  private var fastMemoryCache: [String: String] = [:]
  private var highMemoryCache: [String: String] = [:]

  // MARK: - In-flight guards
  private var fastLoadingIds = Set<String>()
  private var highLoadingIds = Set<String>()

  // MARK: - Pending completion fan-out
  private var fastPendingCompletions: [String: [(String?) -> Void]] = [:]
  private var highPendingCompletions: [String: [(String?) -> Void]] = [:]

  // MARK: - Source state
  // JS calls setActiveSource(...) whenever the visible gallery source changes.
  // We stamp each request/preload task with the source generation that was active
  // when the work started, so late events from an older album can be ignored.
  private var activeSourceId: String = "initial"
  private var activeSourceGeneration: Int = 0

  // We keep track of which thumbnail event has already been emitted for the
  // *current* source generation. This prevents repeated cache-hit replay from
  // causing heavy JS re-rendering during pagination/append, while still allowing
  // a fresh replay after the user switches to a new source.
  private var emittedFastThumbnailUris: [String: String] = [:]
  private var emittedHighThumbnailUris: [String: String] = [:]

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
  private var preloadGeneration: Int = 0

  // MARK: - Preheat tracking
  private var lastPreheatedFastIds: [String] = []
  private var lastPreheatedHighIds: [String] = []

  public func definition() -> ModuleDefinition {
    Name("JpMediaThumbnails")
    Events("onThumbnailReady")

    AsyncFunction("getAlbums") { (promise: Promise) in
      var items: [[String: Any]] = []

      let smartAlbums = PHAssetCollection.fetchAssetCollections(
        with: .smartAlbum,
        subtype: .any,
        options: nil
      )

      smartAlbums.enumerateObjects { collection, _, _ in
        let assets = PHAsset.fetchAssets(in: collection, options: nil)
        let count = assets.count
        guard count > 0 else { return }

        items.append([
          "id": collection.localIdentifier,
          "title": collection.localizedTitle ?? "Untitled",
          "count": count,
          "type": "smart"
        ])
      }

      let userAlbums = PHCollectionList.fetchTopLevelUserCollections(with: nil)
      userAlbums.enumerateObjects { collection, _, _ in
        guard let assetCollection = collection as? PHAssetCollection else { return }

        let assets = PHAsset.fetchAssets(in: assetCollection, options: nil)
        let count = assets.count
        guard count > 0 else { return }

        items.append([
          "id": assetCollection.localIdentifier,
          "title": assetCollection.localizedTitle ?? "Untitled",
          "count": count,
          "type": "user"
        ])
      }

      promise.resolve(items)
    }

    AsyncFunction("setActiveSource") { (sourceId: String, promise: Promise) in
      // Tear down any preload/caching work from the previous source first so
      // the next source starts from a clean native state.
      self.stopPreloading()

      let nextGeneration = self.stateQueue.sync { () -> Int in
        self.activeSourceId = sourceId
        self.activeSourceGeneration += 1

        // New source = new replay window. Clear emitted-event tracking so cached
        // thumbnails can be emitted once again for the new album if needed.
        self.emittedFastThumbnailUris.removeAll()
        self.emittedHighThumbnailUris.removeAll()

        return self.activeSourceGeneration
      }

      promise.resolve(nextGeneration)
    }

    AsyncFunction("getAssetsInAlbum") { (albumId: String, first: Int, after: String?, promise: Promise) in
      let collections = PHAssetCollection.fetchAssetCollections(
        withLocalIdentifiers: [albumId],
        options: nil
      )

      guard let collection = collections.firstObject else {
        promise.resolve([
          "assets": [],
          "hasNextPage": false,
          "endCursor": NSNull()
        ])
        return
      }

      let options = PHFetchOptions()
      options.sortDescriptors = [
        NSSortDescriptor(key: "creationDate", ascending: false)
      ]

      let fetchResult = PHAsset.fetchAssets(in: collection, options: options)
      let totalCount = fetchResult.count

      if totalCount == 0 {
        promise.resolve([
          "assets": [],
          "hasNextPage": false,
          "endCursor": NSNull()
        ])
        return
      }

      var startIndex = 0

      if let after, !after.isEmpty {
        let afterResult = PHAsset.fetchAssets(withLocalIdentifiers: [after], options: nil)
        if let afterAsset = afterResult.firstObject {
          let index = fetchResult.index(of: afterAsset)
          if index != NSNotFound {
            startIndex = index + 1
          }
        }
      }

      if startIndex >= totalCount {
        promise.resolve([
          "assets": [],
          "hasNextPage": false,
          "endCursor": NSNull()
        ])
        return
      }

      let pageSize = max(1, first)
      let endExclusive = min(startIndex + pageSize, totalCount)

      var items: [[String: Any]] = []
      items.reserveCapacity(endExclusive - startIndex)

      if startIndex < endExclusive {
        for index in startIndex..<endExclusive {
          let asset = fetchResult.object(at: index)

          var payload: [String: Any] = [
            "id": asset.localIdentifier,
            "mediaType": asset.mediaType == .video ? "video" : "photo",
            "width": asset.pixelWidth,
            "height": asset.pixelHeight
          ]

          if asset.mediaType == .video {
            payload["duration"] = asset.duration
          }

          items.append(payload)
        }
      }

      let endCursor: String? = items.isEmpty
        ? nil
        : fetchResult.object(at: endExclusive - 1).localIdentifier

      let hasNextPage = endExclusive < totalCount

      promise.resolve([
        "assets": items,
        "hasNextPage": hasNextPage,
        "endCursor": endCursor ?? NSNull()
      ])
    }

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

    AsyncFunction("debugGetPreloadGeneration") { (promise: Promise) in
      promise.resolve(self.preloadGeneration)
    }
  }

  // MARK: - Event helpers

  private func getActiveSourceGeneration() -> Int {
    return stateQueue.sync { activeSourceGeneration }
  }

  private func clearEmittedThumbnailEvents() {
    stateQueue.sync {
      emittedFastThumbnailUris.removeAll()
      emittedHighThumbnailUris.removeAll()
    }
  }

  private func shouldEmitThumbnailReady(
    assetId: String,
    quality: String,
    uri: String,
    sourceGeneration: Int
  ) -> Bool {
    return stateQueue.sync {
      // Never emit an event for stale work after JS has already switched to a
      // newer source generation.
      if sourceGeneration != activeSourceGeneration {
        return false
      }

      if quality == "high" {
        if emittedHighThumbnailUris[assetId] == uri {
          return false
        }

        emittedHighThumbnailUris[assetId] = uri
        return true
      }

      // Once high has been emitted for the current source, do not let a later
      // fast event downgrade the visible thumbnail in JS.
      if emittedHighThumbnailUris[assetId] != nil {
        return false
      }

      if emittedFastThumbnailUris[assetId] == uri {
        return false
      }

      emittedFastThumbnailUris[assetId] = uri
      return true
    }
  }

  private func emitThumbnailReady(
    assetId: String,
    quality: String,
    uri: String,
    sourceGeneration: Int
  ) {
    guard shouldEmitThumbnailReady(
      assetId: assetId,
      quality: quality,
      uri: uri,
      sourceGeneration: sourceGeneration
    ) else {
      return
    }

    sendEvent("onThumbnailReady", [
      "assetId": assetId,
      "quality": quality,
      "uri": uri,
      "sourceGeneration": sourceGeneration
    ])
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
    return stateQueue.sync {
      if quality == "high" {
        return highMemoryCache[key]
      }
      return fastMemoryCache[key]
    }
  }

  private func setMemoryCachedUri(_ uri: String, for key: String, quality: String) {
    stateQueue.sync {
      if quality == "high" {
        highMemoryCache[key] = uri
      } else {
        fastMemoryCache[key] = uri
      }
    }
  }

  private func isLoading(assetId: String, quality: String) -> Bool {
    return stateQueue.sync {
      if quality == "high" {
        return highLoadingIds.contains(assetId)
      }
      return fastLoadingIds.contains(assetId)
    }
  }

  private func markLoading(assetId: String, quality: String) {
    stateQueue.sync {
      if quality == "high" {
        highLoadingIds.insert(assetId)
      } else {
        fastLoadingIds.insert(assetId)
      }
    }
  }

  private func unmarkLoading(assetId: String, quality: String) {
    stateQueue.sync {
      if quality == "high" {
        highLoadingIds.remove(assetId)
      } else {
        fastLoadingIds.remove(assetId)
      }
    }
  }

  // MARK: - Pending completion helpers

  private func appendPendingCompletion(
    assetId: String,
    quality: String,
    completion: @escaping (String?) -> Void
  ) {
    stateQueue.sync {
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
  }

  private func resolvePendingCompletions(
    assetId: String,
    quality: String,
    uri: String?
  ) {
    let completions: [(String?) -> Void] = stateQueue.sync {
      if quality == "high" {
        return highPendingCompletions.removeValue(forKey: assetId) ?? []
      } else {
        return fastPendingCompletions.removeValue(forKey: assetId) ?? []
      }
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
    let sourceGeneration = getActiveSourceGeneration()
    let scale = UIScreen.main.scale
    let cacheKey = makeMemoryCacheKey(
      assetId: assetId,
      width: width,
      height: height,
      scale: scale,
      quality: quality
    )

    if let memoryUri = getMemoryCachedUri(for: cacheKey, quality: quality) {
      emitThumbnailReady(
        assetId: assetId,
        quality: quality,
        uri: memoryUri,
        sourceGeneration: sourceGeneration
      )
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
      completion(nil)
      return
    }

    let fileUri = fileURL.absoluteString

    if FileManager.default.fileExists(atPath: fileURL.path) {
      setMemoryCachedUri(fileUri, for: cacheKey, quality: quality)
      emitThumbnailReady(
        assetId: assetId,
        quality: quality,
        uri: fileUri,
        sourceGeneration: sourceGeneration
      )
      completion(fileUri)
      return
    }

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

    func finish(_ uri: String?) {
      self.unmarkLoading(assetId: assetId, quality: quality)
      self.resolvePendingCompletions(assetId: assetId, quality: quality, uri: uri)
    }

    imageManager.requestImage(
      for: asset,
      targetSize: targetSize,
      contentMode: .aspectFill,
      options: requestOptions
    ) { image, info in
      let isCancelled = (info?[PHImageCancelledKey] as? Bool) ?? false
      let isDegraded = (info?[PHImageResultIsDegradedKey] as? Bool) ?? false
      let hasError = info?[PHImageErrorKey] != nil

      if isCancelled || hasError {
        finish(nil)
        return
      }

      // High-quality requests frequently receive a degraded callback first.
      // We must keep the request alive until the final full-quality image arrives.
      if quality == "high" && isDegraded {
        return
      }

      guard let image else {
        finish(nil)
        return
      }

      let compressionQuality: CGFloat = quality == "high" ? 0.9 : 0.72

      guard let data = image.jpegData(compressionQuality: compressionQuality) else {
        finish(nil)
        return
      }

      do {
        try data.write(to: fileURL, options: .atomic)
        self.setMemoryCachedUri(fileUri, for: cacheKey, quality: quality)
        self.emitThumbnailReady(
          assetId: assetId,
          quality: quality,
          uri: fileUri,
          sourceGeneration: sourceGeneration
        )
        finish(fileUri)
      } catch {
        finish(nil)
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

  // MARK: - Preload helpers

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
      }

      if !isLoading(assetId: assetId, quality: "high") {
        return true
      }
    }

    return false
  }

  private func getPreloadSnapshot() -> (
    assetIds: [String],
    width: CGFloat,
    height: CGFloat,
    fastBatchSize: Int,
    highBatchSize: Int,
    shouldStop: Bool,
    sourceGeneration: Int
  ) {
    return stateQueue.sync {
      (
        assetIds: preloadAssetIds,
        width: preloadWidth,
        height: preloadHeight,
        fastBatchSize: preloadFastBatchSize,
        highBatchSize: preloadHighBatchSize,
        shouldStop: shouldStopPreloading,
        sourceGeneration: activeSourceGeneration
      )
    }
  }

  private func tryBeginFastPreload() -> Bool {
    return stateQueue.sync {
      if shouldStopPreloading { return false }
      if isPreloadingFast { return false }
      if preloadAssetIds.isEmpty { return false }

      isPreloadingFast = true
      return true
    }
  }

  private func endFastPreload() {
    stateQueue.sync {
      isPreloadingFast = false
    }
  }

  private func tryBeginHighPreload() -> Bool {
    return stateQueue.sync {
      if shouldStopPreloading { return false }
      if isPreloadingHigh { return false }
      if preloadAssetIds.isEmpty { return false }

      isPreloadingHigh = true
      return true
    }
  }

  private func endHighPreload() {
    stateQueue.sync {
      isPreloadingHigh = false
    }
  }

  private func getFastPreloadIndex() -> Int {
    return stateQueue.sync { preloadFastIndex }
  }

  private func setFastPreloadIndex(_ index: Int) {
    stateQueue.sync {
      preloadFastIndex = index
    }
  }

  private func getHighPreloadIndex() -> Int {
    return stateQueue.sync { preloadHighIndex }
  }

  private func setHighPreloadIndex(_ index: Int) {
    stateQueue.sync {
      preloadHighIndex = index
    }
  }

  private func getLastPreheatedFastIds() -> [String] {
    return stateQueue.sync { lastPreheatedFastIds }
  }

  private func setLastPreheatedFastIds(_ ids: [String]) {
    stateQueue.sync {
      lastPreheatedFastIds = ids
    }
  }

  private func getLastPreheatedHighIds() -> [String] {
    return stateQueue.sync { lastPreheatedHighIds }
  }

  private func setLastPreheatedHighIds(_ ids: [String]) {
    stateQueue.sync {
      lastPreheatedHighIds = ids
    }
  }

  // MARK: - Preload engine

  private func startPreloading(
    assetIds: [String],
    width: CGFloat,
    height: CGFloat,
    fastBatchSize: Int,
    highBatchSize: Int
  ) {
    let isFreshStart = preloadAssetIds.isEmpty || shouldStopPreloading

    preloadAssetIds = assetIds
    preloadWidth = width
    preloadHeight = height
    preloadFastBatchSize = max(1, fastBatchSize)
    preloadHighBatchSize = max(1, highBatchSize)

    shouldStopPreloading = false

    // Important: keep the current indexes for append/pagination in the same
    // source so high-quality progression continues from the tail instead of
    // repeatedly restarting near the front.
    if isFreshStart {
      preloadFastIndex = 0
      preloadHighIndex = 0
    } else {
      preloadFastIndex = min(preloadFastIndex, preloadAssetIds.count)
      preloadHighIndex = min(preloadHighIndex, preloadAssetIds.count)
    }

    scheduleFastPreload()
    scheduleHighPreload()
  }

  private func stopPreloading() {
    preloadGeneration += 1
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
    fastLoadingIds.removeAll()
    highLoadingIds.removeAll()

    // Clear per-source emitted-event tracking so the next source can replay
    // cached results once from a clean state.
    clearEmittedThumbnailEvents()

    imageManager.stopCachingImagesForAllAssets()
  }

  private func scheduleFastPreload() {
    guard tryBeginFastPreload() else { return }
    let generation = preloadGeneration

    DispatchQueue.global(qos: .userInitiated).asyncAfter(deadline: .now() + 0.05) {
      if generation != self.preloadGeneration {
        self.endFastPreload()
        return
      }

      let snapshot = self.getPreloadSnapshot()

      if snapshot.shouldStop || generation != self.preloadGeneration {
        self.endFastPreload()
        return
      }

      let scale = UIScreen.main.scale
      var batchIds: [String] = []
      var index = self.getFastPreloadIndex()

      while index < snapshot.assetIds.count && batchIds.count < snapshot.fastBatchSize {
        if generation != self.preloadGeneration {
          self.endFastPreload()
          return
        }

        let assetId = snapshot.assetIds[index]
        index += 1

        let cacheKey = self.makeMemoryCacheKey(
          assetId: assetId,
          width: snapshot.width,
          height: snapshot.height,
          scale: scale,
          quality: "fast"
        )

        if let uri = self.getMemoryCachedUri(for: cacheKey, quality: "fast") {
          self.emitThumbnailReady(
            assetId: assetId,
            quality: "fast",
            uri: uri,
            sourceGeneration: snapshot.sourceGeneration
          )
          continue
        }

        do {
          let fileURL = try self.makeCacheFileURL(
            assetId: assetId,
            width: snapshot.width,
            height: snapshot.height,
            scale: scale,
            quality: "fast"
          )

          if FileManager.default.fileExists(atPath: fileURL.path) {
            let uri = fileURL.absoluteString
            self.setMemoryCachedUri(uri, for: cacheKey, quality: "fast")
            self.emitThumbnailReady(
              assetId: assetId,
              quality: "fast",
              uri: uri,
              sourceGeneration: snapshot.sourceGeneration
            )
            continue
          }
        } catch {
        }

        if self.isLoading(assetId: assetId, quality: "fast") {
          continue
        }

        batchIds.append(assetId)
      }

      if generation != self.preloadGeneration {
        self.endFastPreload()
        return
      }

      // Do not wrap back to 0 here. Keeping the tail index prevents large
      // albums from repeatedly re-scanning the front and starving later assets.
      self.setFastPreloadIndex(min(index, snapshot.assetIds.count))

      guard !batchIds.isEmpty else {
        self.endFastPreload()

        if self.hasPendingFastPreload() && generation == self.preloadGeneration {
          self.scheduleFastPreload()
        }

        return
      }

      let preheatIds = Array(batchIds.prefix(min(batchIds.count, 60)))
      let previousPreheatedIds = self.getLastPreheatedFastIds()

      if !previousPreheatedIds.isEmpty {
        self.stopCaching(
          assetIds: previousPreheatedIds,
          width: snapshot.width,
          height: snapshot.height,
          quality: "fast"
        )
      }

      self.startCaching(
        assetIds: preheatIds,
        width: snapshot.width,
        height: snapshot.height,
        quality: "fast"
      )

      self.setLastPreheatedFastIds(preheatIds)

      let dispatchGroup = DispatchGroup()

      for assetId in batchIds {
        dispatchGroup.enter()

        self.requestThumbnail(
          assetId: assetId,
          width: snapshot.width,
          height: snapshot.height,
          quality: "fast"
        ) { _ in
          dispatchGroup.leave()
        }
      }

      dispatchGroup.notify(queue: .main) {
        if generation != self.preloadGeneration {
          self.endFastPreload()
          return
        }

        self.endFastPreload()

        let current = self.getPreloadSnapshot()
        if self.hasPendingFastPreload() && !current.shouldStop && generation == self.preloadGeneration {
          self.scheduleFastPreload()
        }
      }
    }
  }

  private func scheduleHighPreload() {
    guard tryBeginHighPreload() else { return }
    let generation = preloadGeneration

    DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + 0.12) {
      if generation != self.preloadGeneration {
        self.endHighPreload()
        return
      }

      let snapshot = self.getPreloadSnapshot()

      if snapshot.shouldStop || generation != self.preloadGeneration {
        self.endHighPreload()
        return
      }

      let scale = UIScreen.main.scale
      var batchIds: [String] = []
      var index = self.getHighPreloadIndex()

      while index < snapshot.assetIds.count && batchIds.count < snapshot.highBatchSize {
        if generation != self.preloadGeneration {
          self.endHighPreload()
          return
        }

        let assetId = snapshot.assetIds[index]
        index += 1

        let fastKey = self.makeMemoryCacheKey(
          assetId: assetId,
          width: snapshot.width,
          height: snapshot.height,
          scale: scale,
          quality: "fast"
        )

        let hasFastMemory = self.getMemoryCachedUri(for: fastKey, quality: "fast") != nil

        let hasFastDisk: Bool = {
          do {
            let url = try self.makeCacheFileURL(
              assetId: assetId,
              width: snapshot.width,
              height: snapshot.height,
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
          width: snapshot.width,
          height: snapshot.height,
          scale: scale,
          quality: "high"
        )

        if let uri = self.getMemoryCachedUri(for: highKey, quality: "high") {
          self.emitThumbnailReady(
            assetId: assetId,
            quality: "high",
            uri: uri,
            sourceGeneration: snapshot.sourceGeneration
          )
          continue
        }

        do {
          let highURL = try self.makeCacheFileURL(
            assetId: assetId,
            width: snapshot.width,
            height: snapshot.height,
            scale: scale,
            quality: "high"
          )

          if FileManager.default.fileExists(atPath: highURL.path) {
            let uri = highURL.absoluteString
            self.setMemoryCachedUri(uri, for: highKey, quality: "high")
            self.emitThumbnailReady(
              assetId: assetId,
              quality: "high",
              uri: uri,
              sourceGeneration: snapshot.sourceGeneration
            )
            continue
          }
        } catch {
        }

        if self.isLoading(assetId: assetId, quality: "high") {
          continue
        }

        batchIds.append(assetId)
      }

      if generation != self.preloadGeneration {
        self.endHighPreload()
        return
      }

      // Do not wrap back to 0 here for the same reason as fast preload.
      self.setHighPreloadIndex(min(index, snapshot.assetIds.count))

      guard !batchIds.isEmpty else {
        self.endHighPreload()

        if self.hasPendingHighPreload() && generation == self.preloadGeneration {
          self.scheduleHighPreload()
        }

        return
      }

      let preheatIds = Array(batchIds.prefix(min(batchIds.count, 30)))
      let previousPreheatedIds = self.getLastPreheatedHighIds()

      if !previousPreheatedIds.isEmpty {
        self.stopCaching(
          assetIds: previousPreheatedIds,
          width: snapshot.width,
          height: snapshot.height,
          quality: "high"
        )
      }

      self.startCaching(
        assetIds: preheatIds,
        width: snapshot.width,
        height: snapshot.height,
        quality: "high"
      )

      self.setLastPreheatedHighIds(preheatIds)

      let dispatchGroup = DispatchGroup()

      for assetId in batchIds {
        dispatchGroup.enter()

        self.requestThumbnail(
          assetId: assetId,
          width: snapshot.width,
          height: snapshot.height,
          quality: "high"
        ) { _ in
          dispatchGroup.leave()
        }
      }

      dispatchGroup.notify(queue: .main) {
        if generation != self.preloadGeneration {
          self.endHighPreload()
          return
        }

        self.endHighPreload()

        let current = self.getPreloadSnapshot()
        if self.hasPendingHighPreload() && !current.shouldStop && generation == self.preloadGeneration {
          self.scheduleHighPreload()
        }
      }
    }
  }
}
