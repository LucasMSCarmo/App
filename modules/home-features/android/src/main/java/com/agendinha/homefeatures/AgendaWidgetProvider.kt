package com.agendinha.homefeatures

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import org.json.JSONArray
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class AgendaWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray
  ) {
    appWidgetIds.forEach { widgetId ->
      appWidgetManager.updateAppWidget(widgetId, createRemoteViews(context, widgetId))
    }
  }

  override fun onAppWidgetOptionsChanged(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int,
    newOptions: Bundle
  ) {
    appWidgetManager.updateAppWidget(
      appWidgetId,
      createRemoteViews(context, appWidgetId)
    )
  }

  companion object {
    const val PREFERENCES_NAME = "agendinha_widget"
    const val TASKS_KEY = "today_tasks"

    private const val HOME_URL = "agendinha://home"
    private const val QUICK_CREATE_URL = "agendinha://home?quickCreate=1"
    private const val MAX_VISIBLE_TASKS = 4

    private val rowIds = intArrayOf(
      R.id.widget_task_row_1,
      R.id.widget_task_row_2,
      R.id.widget_task_row_3,
      R.id.widget_task_row_4
    )
    private val taskIds = intArrayOf(
      R.id.widget_task_1,
      R.id.widget_task_2,
      R.id.widget_task_3,
      R.id.widget_task_4
    )
    private val statusIds = intArrayOf(
      R.id.widget_task_status_1,
      R.id.widget_task_status_2,
      R.id.widget_task_status_3,
      R.id.widget_task_status_4
    )
    private val timeIds = intArrayOf(
      R.id.widget_task_time_1,
      R.id.widget_task_time_2,
      R.id.widget_task_time_3,
      R.id.widget_task_time_4
    )

    fun updateAllWidgets(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val component = ComponentName(context, AgendaWidgetProvider::class.java)
      val widgetIds = manager.getAppWidgetIds(component)
      widgetIds.forEach { widgetId ->
        manager.updateAppWidget(widgetId, createRemoteViews(context, widgetId))
      }
    }

    private fun createRemoteViews(context: Context, widgetId: Int): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.agenda_widget)
      val tasks = readTasks(context)
      val visibleTaskCount = visibleTaskCount(context, widgetId)
      val openHomeIntent = deepLinkPendingIntent(context, HOME_URL, 100)
      val quickCreateIntent = deepLinkPendingIntent(context, QUICK_CREATE_URL, 101)
      val completed = (0 until tasks.length()).count { index ->
        tasks.optJSONObject(index)?.optBoolean("done") == true
      }
      val pending = tasks.length() - completed

      views.setOnClickPendingIntent(R.id.widget_container, openHomeIntent)
      views.setOnClickPendingIntent(R.id.widget_add, quickCreateIntent)
      views.setTextViewText(R.id.widget_date, formattedDate())
      views.setTextViewText(
        R.id.widget_summary,
        when {
          tasks.length() == 0 -> "Seu dia está livre"
          pending == 0 -> "Tudo concluído"
          pending == 1 -> "1 tarefa pendente"
          else -> "$pending tarefas pendentes"
        }
      )
      views.setProgressBar(
        R.id.widget_progress,
        tasks.length().coerceAtLeast(1),
        completed,
        false
      )
      views.setViewVisibility(
        R.id.widget_progress,
        if (tasks.length() > 0) View.VISIBLE else View.INVISIBLE
      )
      views.setViewVisibility(
        R.id.widget_empty,
        if (tasks.length() == 0) View.VISIBLE else View.GONE
      )

      rowIds.forEachIndexed { index, rowId ->
        if (index < tasks.length() && index < visibleTaskCount) {
          val task = tasks.optJSONObject(index)
          val id = task?.optString("id").orEmpty()
          val title = task?.optString("title").orEmpty().ifBlank { "Tarefa sem título" }
          val time = validTime(task?.takeUnless { it.isNull("time") }?.optString("time"))
          val done = task?.optBoolean("done") == true

          views.setViewVisibility(rowId, View.VISIBLE)
          views.setTextViewText(statusIds[index], if (done) "\u2713" else "\u25CB")
          views.setTextViewText(taskIds[index], title)
          views.setTextViewText(timeIds[index], time.orEmpty())
          views.setViewVisibility(
            timeIds[index],
            if (time == null) View.GONE else View.VISIBLE
          )
          views.setTextColor(
            statusIds[index],
            context.getColor(if (done) R.color.widget_task_done else R.color.widget_primary)
          )
          views.setTextColor(
            taskIds[index],
            context.getColor(if (done) R.color.widget_text_done else R.color.widget_text)
          )
          if (id.isNotBlank()) {
            views.setOnClickPendingIntent(
              rowId,
              deepLinkPendingIntent(context, "agendinha://task/$id", 200 + index)
            )
          }
        } else {
          views.setViewVisibility(rowId, View.GONE)
        }
      }

      val remaining = (tasks.length() - visibleTaskCount).coerceAtLeast(0)
      val footer = when {
        tasks.length() == 0 -> "Toque em + para planejar"
        remaining == 1 -> "+ 1 outra tarefa"
        remaining > 1 -> "+ $remaining outras tarefas"
        completed == tasks.length() -> "Bom trabalho!"
        completed == 0 -> "${tasks.length()} ${if (tasks.length() == 1) "tarefa" else "tarefas"} hoje"
        else -> "$completed de ${tasks.length()} concluídas"
      }
      views.setTextViewText(R.id.widget_footer, footer)
      return views
    }

    private fun visibleTaskCount(context: Context, widgetId: Int): Int {
      val options = AppWidgetManager.getInstance(context).getAppWidgetOptions(widgetId)
      val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 180)
      return when {
        minHeight < 165 -> 2
        minHeight < 215 -> 3
        else -> MAX_VISIBLE_TASKS
      }
    }

    private fun validTime(value: String?): String? {
      val normalized = value?.trim()
      return normalized?.takeIf {
        it.isNotEmpty() &&
          !it.equals("null", ignoreCase = true) &&
          !it.equals("undefined", ignoreCase = true)
      }
    }

    private fun formattedDate(): String {
      val locale = Locale.forLanguageTag("pt-BR")
      val date = SimpleDateFormat("EEE, d 'de' MMM", locale).format(Date())
      return date.replaceFirstChar { char ->
        if (char.isLowerCase()) char.titlecase(locale) else char.toString()
      }
    }

    private fun readTasks(context: Context): JSONArray {
      val value = context
        .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
        .getString(TASKS_KEY, "[]")
      return try {
        JSONArray(value ?: "[]")
      } catch (_: Exception) {
        JSONArray()
      }
    }

    private fun deepLinkPendingIntent(
      context: Context,
      url: String,
      requestCode: Int
    ): PendingIntent {
      val launchIntent = context.packageManager
        .getLaunchIntentForPackage(context.packageName)
        ?: Intent()
      launchIntent.action = Intent.ACTION_VIEW
      launchIntent.data = Uri.parse(url)
      launchIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP

      return PendingIntent.getActivity(
        context,
        requestCode,
        launchIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }
  }
}
