import Foundation
import Photos
import UIKit

actor ThumbnailService {
    private let imageManager = PHCachingImageManager()
    
    private var memoryCache: [ThumbnailKey: URL] = [:]
    private var inFlightTasks: [ThumbnailKey: Task<URL?, Never>] = [:]
    
    // MARK: - Public
    
    func thumbnail(
        assetId: String,
        options: ThumbnailOptions
    ) async -> URL? {
        let scale = await MainActor.run {
            UIScreen.main.scale
        }
        
        let key = ThumbnailKey(
            assetId: assetId,
            pixelWidth: Int(options.width * scale),
            pixelHeight: Int(options.height * scale),
        )
        
        // 1. Memory cache
        if let cachedURL = memoryCache[key] {
            return cachedURL
        }
        
        // 2. Disk cache
        guard let fileURL = try? cacheFileURL(for: key) else {
            return nil
        }
        
        if FileManager.default.fileExists(atPath: fileURL.path) {
            memoryCache[key] = fileURL
            return fileURL
        }
        
        // 3. Same request already running.
        //
        // All callers await the same Task instead of maintaining separate
        // loading sets and completion arrays.
        if let existingTask = inFlightTasks[key] {
            return await existingTask.value
        }
        
        // 4. Start request
        let task = Task<URL?, Never> { [weak self] in
            guard let self else {
                return nil
            }
            
            return await self.generateThumbnail(
                key: key,
                fileURL: fileURL
            )
        }
        
        inFlightTasks[key] = task
        
        let result = await task.value
        
        inFlightTasks[key] = nil
        
        if let result {
            memoryCache[key] = result
        }
        
        return result
    }
    
    func cachedThumbnail(
        assetId: String,
        options: ThumbnailOptions
    ) async -> URL? {
        let scale = await MainActor.run {
            UIScreen.main.scale
        }
        
        let key = ThumbnailKey(
            assetId: assetId,
            pixelWidth: Int(options.width * scale),
            pixelHeight: Int(options.height * scale),
        )
        
        if let cachedURL = memoryCache[key] {
            return cachedURL
        }
        
        guard let fileURL = try? cacheFileURL(for: key) else {
            return nil
        }
        
        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            return nil
        }
        
        memoryCache[key] = fileURL
        return fileURL
    }
    
    // MARK: - Generation
    
    private func generateThumbnail(
        key: ThumbnailKey,
        fileURL: URL
    ) async -> URL? {
        guard let asset = fetchAsset(id: key.assetId) else {
            return nil
        }

        guard let image = await requestImage(
            for: asset,
            key: key
        ) else {
            return nil
        }

        guard let data = image.jpegData(
            compressionQuality: 0.85
        ) else {
            return nil
        }

        do {
            try data.write(
                to: fileURL,
                options: .atomic
            )

            return fileURL
        } catch {
            return nil
        }
    }
    
    // MARK: - Photos
    
    private func fetchAsset(id: String) -> PHAsset? {
        PHAsset
            .fetchAssets(
                withLocalIdentifiers: [id],
                options: nil
            )
            .firstObject
    }
    
    private func fetchAssets(
        ids: [String]
    ) -> [PHAsset] {
        guard !ids.isEmpty else {
            return []
        }
        
        let result = PHAsset.fetchAssets(
            withLocalIdentifiers: ids,
            options: nil
        )
        
        var assetsById: [String: PHAsset] = [:]
        assetsById.reserveCapacity(result.count)
        
        result.enumerateObjects { asset, _, _ in
            assetsById[asset.localIdentifier] = asset
        }
        
        return ids.compactMap { assetsById[$0] }
    }
    
    private func makeTargetSize(
        options: ThumbnailOptions,
        scale: CGFloat
    ) -> CGSize {
        CGSize(
            width: options.width * scale,
            height: options.height * scale
        )
    }
    
    private func makeImageRequestOptions() -> PHImageRequestOptions {
        let options = PHImageRequestOptions()
        
        options.isSynchronous = false
        options.isNetworkAccessAllowed = true
        options.deliveryMode = .highQualityFormat
        options.resizeMode = .fast
        
        return options
    }
    
    private func requestImage(
        for asset: PHAsset,
        key: ThumbnailKey
    ) async -> UIImage? {
        await withCheckedContinuation { continuation in
            let options = makeImageRequestOptions()
            
            let lock = NSLock()
            var didResume = false
            
            func resume(_ image: UIImage?) {
                lock.lock()
                defer { lock.unlock() }
                
                guard !didResume else {
                    return
                }
                
                didResume = true
                continuation.resume(returning: image)
            }
            
            imageManager.requestImage(
                for: asset,
                targetSize: CGSize(
                    width: key.pixelWidth,
                    height: key.pixelHeight
                ),
                contentMode: .aspectFill,
                options: options
            ) { image, info in
                let cancelled =
                (info?[PHImageCancelledKey] as? Bool) ?? false
                
                if cancelled {
                    resume(nil)
                    return
                }
                
                if info?[PHImageErrorKey] != nil {
                    resume(nil)
                    return
                }
                
                let degraded =
                (info?[PHImageResultIsDegradedKey] as? Bool) ?? false
                
                // we only use the final image.
                // PhotoKit may invoke the result handler with degraded
                // representation before delivering the final result.
                if degraded {
                    return
                }
                
                guard let image else {
                         resume(nil)
                         return
                     }

                     resume(image)
            }
        }
    }
    
    // MARK: - Disk cache
    
    private func cacheFileURL(
        for key: ThumbnailKey
    ) throws -> URL {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent(
                "jp-media-thumbnails",
                isDirectory: true
            )
        
        try FileManager.default.createDirectory(
            at: directory,
            withIntermediateDirectories: true
        )
        
        let safeAssetId = makeSafeAssetId(key.assetId)
        
        let fileName =
            "\(safeAssetId)_\(key.pixelWidth)x\(key.pixelHeight).jpg"
        
        return directory.appendingPathComponent(fileName)
    }
    
    private func makeSafeAssetId(
        _ assetId: String
    ) -> String {
        assetId
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: ":", with: "_")
            .replacingOccurrences(of: " ", with: "_")
    }
    
    
    func startCaching(
        assetIds: [String],
        options: ThumbnailOptions
    ) async {
        guard !assetIds.isEmpty else {
            return
        }
        
        let scale = await MainActor.run {
            UIScreen.main.scale
        }
        
        let assets = fetchAssets(ids: assetIds)
        
        guard !assets.isEmpty else {
            return
        }
        
        let targetSize = makeTargetSize(
            options: options,
            scale: scale
        )
        
        imageManager.startCachingImages(
            for: assets,
            targetSize: targetSize,
            contentMode: .aspectFill,
            options: makeImageRequestOptions()
        )
    }
    
    func stopCaching(
        assetIds: [String],
        options: ThumbnailOptions
    ) async {
        guard !assetIds.isEmpty else {
            return
        }
        
        let scale = await MainActor.run {
            UIScreen.main.scale
        }
        
        let assets = fetchAssets(ids: assetIds)
        
        guard !assets.isEmpty else {
            return
        }
        
        let targetSize = makeTargetSize(
            options: options,
            scale: scale
        )
        
        imageManager.stopCachingImages(
            for: assets,
            targetSize: targetSize,
            contentMode: .aspectFill,
            options: makeImageRequestOptions()
        )
    }
    
    func stopCachingAll() {
        imageManager.stopCachingImagesForAllAssets()
    }
}
