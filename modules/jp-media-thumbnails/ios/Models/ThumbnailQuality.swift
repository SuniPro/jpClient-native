import Photos
import UIKit

enum ThumbnailQuality: String, Sendable {
    case fast
    case high

    var deliveryMode: PHImageRequestOptionsDeliveryMode {
        switch self {
        case .fast:
            return .fastFormat
        case .high:
            return .highQualityFormat
        }
    }

    var resizeMode: PHImageRequestOptionsResizeMode {
        switch self {
        case .fast:
            return .fast
        case .high:
            return .fast
        }
    }

    var compressionQuality: CGFloat {
        switch self {
        case .fast:
            return 0.72
        case .high:
            return 0.85
        }
    }
}
