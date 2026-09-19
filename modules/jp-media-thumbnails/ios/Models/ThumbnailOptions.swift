import CoreGraphics

struct ThumbnailOptions: Sendable {
    let width: CGFloat
    let height: CGFloat

    init(
        width: CGFloat = 200,
        height: CGFloat = 200
    ) {
        self.width = width
        self.height = height
    }
}
