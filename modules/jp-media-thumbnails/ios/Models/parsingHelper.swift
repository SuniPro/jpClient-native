import CoreGraphics

enum ParsingHelper {
    static func makeThumbnailOptions(
        _ options: [String: Any]
    ) -> ThumbnailOptions {
        let width = (options["width"] as? Double)
            .map { CGFloat($0) } ?? 200

        let height = (options["height"] as? Double)
            .map { CGFloat($0) } ?? 200

        return ThumbnailOptions(
            width: width,
            height: height
        )
    }
}

