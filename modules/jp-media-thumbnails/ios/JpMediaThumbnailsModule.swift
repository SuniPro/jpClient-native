import ExpoModulesCore
import Photos
import UIKit

public class JpMediaThumbnailsModule: Module {
    
    private let thumbnailService = ThumbnailService()
    
    private let imageManager = PHCachingImageManager()
    
    
    public func definition() -> ModuleDefinition {
        Name("JpMediaThumbnails")
        
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
                
                var payload: [String: Any] = [
                    "id": collection.localIdentifier,
                    "title": collection.localizedTitle ?? "Untitled",
                    "count": count,
                    "type": "smart"
                ]
                
                switch collection.assetCollectionSubtype {
                case .smartAlbumUserLibrary:
                    payload["systemKey"] = "recent"
                case .smartAlbumFavorites:
                    payload["systemKey"] = "favorites"
                case .smartAlbumVideos:
                    payload["systemKey"] = "videos"
                default:
                    break
                }
                
                items.append(payload)
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
        
        AsyncFunction("getThumbnail") {
            (
                assetId: String,
                options: [String: Any],
                promise: Promise
            ) in
            
            let thumbnailOptions = ParsingHelper.makeThumbnailOptions(options)
            
            Task {
                let url = await self.thumbnailService.thumbnail(
                    assetId: assetId,
                    options: thumbnailOptions
                )
                
                promise.resolve(url?.absoluteString)
            }
        }
        
        AsyncFunction("getThumbnailBatch") {
            (
                assetIds: [String],
                options: [String: Any],
                promise: Promise
            ) in
            let thumbnailOptions = ParsingHelper.makeThumbnailOptions(options)
            
            guard !assetIds.isEmpty else {
                promise.resolve([String: String?]())
                return
            }
            
            Task {
                let results = await withTaskGroup(
                    of: (String, String?).self,
                    returning: [String: String?].self
                ) { group in
                    for assetId in assetIds {
                        group.addTask {
                            let url = await self.thumbnailService.thumbnail(
                                assetId: assetId,
                                options: thumbnailOptions
                            )
                            
                            return (
                                assetId,
                                url?.absoluteString
                            )
                        }
                    }
                    
                    var results: [String: String?] = [:]
                    results.reserveCapacity(assetIds.count)
                    
                    for await (assetId, uri) in group {
                        results[assetId] = uri
                    }
                    
                    return results
                }
                
                promise.resolve(results)
            }
        }
        
        AsyncFunction("getCachedThumbnail") {
            (
                assetId: String,
                options: [String: Any],
                promise: Promise
            ) in
            
            let thumbnailOptions = ParsingHelper.makeThumbnailOptions(options)
            
            Task {
                let url = await self.thumbnailService.cachedThumbnail(
                    assetId: assetId,
                    options: thumbnailOptions
                )
                
                promise.resolve(url?.absoluteString)
            }
        }
        
        AsyncFunction("startPreloading") { (
            assetIds : [String],
            options : [String: Any],
            promise : Promise
        ) in
            
            let thumbnailOptions = ParsingHelper.makeThumbnailOptions(options)
            
            Task {
                await self.thumbnailService.startCaching(assetIds: assetIds, options: thumbnailOptions)
                
                promise.resolve(nil)
            }
        }
        
        AsyncFunction("stopPreloading") { (promise: Promise) in
            Task {
                await self.thumbnailService.stopCachingAll()
                promise.resolve(nil)
            }
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

}
