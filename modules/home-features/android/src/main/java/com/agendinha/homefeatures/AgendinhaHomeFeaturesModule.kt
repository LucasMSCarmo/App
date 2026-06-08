package com.agendinha.homefeatures

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AgendinhaHomeFeaturesModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AgendinhaHomeFeatures")

    AsyncFunction("syncTodayTasksAsync") { tasksJson: String ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      context
        .getSharedPreferences(AgendaWidgetProvider.PREFERENCES_NAME, Context.MODE_PRIVATE)
        .edit()
        .putString(AgendaWidgetProvider.TASKS_KEY, tasksJson)
        .apply()

      AgendaWidgetProvider.updateAllWidgets(context)
      true
    }
  }
}
