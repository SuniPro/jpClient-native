import CoreGraphics

enum ParsingHelper {
    static func makeThumbnailOptions(
        _ options: [String: Any]
    ) -> ThumbnailOptions {
        return ThumbnailOptions(
            width: dimension(options["width"]),
            height: dimension(options["height"])
        )
    }
    
    private static func dimension(_ value: Any?) -> CGFloat {
        guard let number = value as? NSNumber else { return 200 }
        return CGFloat(number.doubleValue)
    }
}
