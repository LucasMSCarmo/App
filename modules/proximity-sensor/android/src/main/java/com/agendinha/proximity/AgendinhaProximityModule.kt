package com.agendinha.proximity

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AgendinhaProximityModule : Module(), SensorEventListener {
  private val sensorManager: SensorManager?
    get() = appContext.reactContext
      ?.getSystemService(Context.SENSOR_SERVICE) as? SensorManager

  private val proximitySensor: Sensor?
    get() = sensorManager?.getDefaultSensor(Sensor.TYPE_PROXIMITY)

  override fun definition() = ModuleDefinition {
    Name("AgendinhaProximity")

    Events(PROXIMITY_EVENT)

    AsyncFunction("isAvailableAsync") {
      proximitySensor != null
    }

    OnStartObserving(PROXIMITY_EVENT) {
      val sensor = proximitySensor ?: return@OnStartObserving
      sensorManager?.registerListener(
        this@AgendinhaProximityModule,
        sensor,
        SensorManager.SENSOR_DELAY_NORMAL
      )
    }

    OnStopObserving(PROXIMITY_EVENT) {
      sensorManager?.unregisterListener(this@AgendinhaProximityModule)
    }
  }

  override fun onSensorChanged(event: SensorEvent) {
    val sensor = event.sensor
    val distance = event.values.firstOrNull() ?: return
    val isNear = distance < sensor.maximumRange

    sendEvent(
      PROXIMITY_EVENT,
      mapOf(
        "isNear" to isNear,
        "distance" to distance,
        "maximumRange" to sensor.maximumRange
      )
    )
  }

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit

  companion object {
    private const val PROXIMITY_EVENT = "onProximityChanged"
  }
}
