import ExpoModulesCore
import UIKit

public final class AgendinhaProximityModule: Module {
  private let proximityEvent = "onProximityChanged"

  public func definition() -> ModuleDefinition {
    Name("AgendinhaProximity")

    Events(proximityEvent)

    AsyncFunction("isAvailableAsync") { () -> Bool in
      let device = UIDevice.current
      let wasEnabled = device.isProximityMonitoringEnabled
      device.isProximityMonitoringEnabled = true
      let available = device.isProximityMonitoringEnabled
      if !wasEnabled {
        device.isProximityMonitoringEnabled = false
      }
      return available
    }
    .runOnQueue(.main)

    OnStartObserving(proximityEvent) {
      DispatchQueue.main.async {
        UIDevice.current.isProximityMonitoringEnabled = true
        NotificationCenter.default.addObserver(
          self,
          selector: #selector(self.handleProximityChange),
          name: UIDevice.proximityStateDidChangeNotification,
          object: nil
        )
      }
    }

    OnStopObserving(proximityEvent) {
      DispatchQueue.main.async {
        NotificationCenter.default.removeObserver(
          self,
          name: UIDevice.proximityStateDidChangeNotification,
          object: nil
        )
        UIDevice.current.isProximityMonitoringEnabled = false
      }
    }
  }

  @objc private func handleProximityChange() {
    sendEvent(proximityEvent, [
      "isNear": UIDevice.current.proximityState
    ])
  }
}
