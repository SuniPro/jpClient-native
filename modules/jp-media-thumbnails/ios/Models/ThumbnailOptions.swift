import CoreGraphics

struct ThumbnailOptions: Sendable {
    let width: CGFloat
    let height: CGFloat

    init(
        width: CGFloat = 200,
        height: CGFloat = 200
    ) {
        self.width = Self.normalize(width)
        self.height = Self.normalize(height)
    }
    
    private static func normalize(_ value: CGFloat) -> CGFloat {
        guard value.isFinite, value > 0 else { return 200 }
        return min(max(value, 1), 1024)
    }
}
