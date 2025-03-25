import { Injectable } from '@angular/core';
import { Utils } from '@nativescript/core';

declare const android: any;
declare const com: any;
declare const java: any;

@Injectable({
  providedIn: 'root'
})
export class FloatingWidgetService {
  private floatingView: any = null;
  private windowManager: any = null;
  private params: any = null;
  private initialX: number = 0;
  private initialY: number = 0;
  private initialTouchX: number = 0;
  private initialTouchY: number = 0;
  private isLocked: boolean = false; // Состояние виджета
  private inactivityTimer: any = null; // Таймер бездействия
  private lastTouchTime: number = 0; // Время последнего касания
  private overlayView: any = null; // Наложение для блокировки экрана
  private currentWidgetX: number = 0; // Текущая позиция виджета X
  private currentWidgetY: number = 0; // Текущая позиция виджета Y
  private widgetSize: number = 100; // Размер виджета

  constructor() { }

  public async showFloatingWidget(): Promise<boolean> {
    console.log("Checking permission...");
    if (!this.checkDrawOverlayPermission()) {
      console.log("No permission, requesting...");
      this.requestDrawOverlayPermission();
      return false;
    }

    console.log("Permission granted, creating widget...");
    try {
      this.createFloatingWidget();
      console.log("Widget created successfully");
      return true;
    } catch (error) {
      console.error("Error creating widget:", error);
      return false;
    }
  }

  public hideFloatingWidget(): void {
    console.log("Attempting to hide widget");
    if (this.floatingView !== null && this.windowManager !== null) {
      try {
        this.windowManager.removeView(this.floatingView);
        this.floatingView = null;
        console.log("Widget hidden successfully");
      } catch (e) {
        console.error('Error removing floating widget', e);
      }
    } else {
      console.log("No widget to hide");
    }

    // Также скрываем наложение, если оно отображается
    this.hideOverlay();
  }

  private checkDrawOverlayPermission(): boolean {
    try {
      if (android.os.Build.VERSION.SDK_INT >= 23) {
        const hasPermission = android.provider.Settings.canDrawOverlays(Utils.android.getApplicationContext());
        console.log("Permission check result:", hasPermission);
        return hasPermission;
      }
      return true;
    } catch (error) {
      console.error("Error checking permission:", error);
      return false;
    }
  }

  private requestDrawOverlayPermission(): void {
    try {
      if (android.os.Build.VERSION.SDK_INT >= 23) {
        console.log("Requesting overlay permission...");
        const intent = new android.content.Intent(
          android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
          android.net.Uri.parse("package:" + Utils.android.getApplicationContext().getPackageName())
        );
        intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
        Utils.android.getApplicationContext().startActivity(intent);
        console.log("Permission request sent");
      }
    } catch (error) {
      console.error("Error requesting permission:", error);
    }
  }

  private toggleLock(): void {
    this.isLocked = !this.isLocked;
    this.floatingView.setText(this.isLocked ? "🔒" : "🔓"); // Изменение текста

    if (this.isLocked) {
      // 1. Сохраняем текущую позицию виджета
      const currentX = this.params.x;
      const currentY = this.params.y;
      
      // 2. Показываем наложение
      this.showSimpleOverlay();
      
      // 3. Удаляем старый виджет
      if (this.floatingView !== null) {
        try {
          this.windowManager.removeView(this.floatingView);
        } catch (e) {
          console.error('Error removing floating widget', e);
        }
      }
      
      // 4. Пересоздаем виджет с той же позицией
      this.createWidget(currentX, currentY);
    } else {
      this.hideOverlay(); // Скрываем наложение
    }
  }

  private showSimpleOverlay(): void {
    // Удаляем старое наложение, если оно есть
    this.hideOverlay();
    
    try {
      const context = Utils.android.getApplicationContext();
      
      // Создаем новое наложение - просто полупрозрачный черный фон
      this.overlayView = new android.view.View(context);
      this.overlayView.setBackgroundColor(android.graphics.Color.argb(150, 0, 0, 0));
      
      // Получаем размеры экрана
      const displayMetrics = context.getResources().getDisplayMetrics();
      const screenWidth = displayMetrics.widthPixels;
      const screenHeight = displayMetrics.heightPixels;
      
      // Создаем параметры для наложения
      const params = new android.view.WindowManager.LayoutParams(
        screenWidth,
        screenHeight,
        android.os.Build.VERSION.SDK_INT >= 26 
          ? android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY 
          : android.view.WindowManager.LayoutParams.TYPE_PHONE,
        android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
        android.graphics.PixelFormat.TRANSLUCENT
      );
      
      params.gravity = android.view.Gravity.TOP | android.view.Gravity.LEFT;
      params.x = 0;
      params.y = 0;
      
      // Добавляем наложение в WindowManager
      this.windowManager.addView(this.overlayView, params);
    } catch (error) {
      console.error("Error creating overlay:", error);
    }
  }

  private createWidget(x: number, y: number): void {
    try {
      const context = Utils.android.getApplicationContext();
      
      // Создаем TextView для виджета
      this.floatingView = new android.widget.TextView(context);
      
      // Устанавливаем текст и стили в зависимости от состояния isLocked
      this.floatingView.setText(this.isLocked ? "🔒" : "🔓"); // Устанавливаем текст замочка
      this.floatingView.setTextSize(25);
      this.floatingView.setTextColor(android.graphics.Color.BLACK); // Черный цвет текста
      
      // Создаем круглый фон
      const shape = new android.graphics.drawable.GradientDrawable();
      shape.setShape(android.graphics.drawable.GradientDrawable.OVAL);
      shape.setColor(android.graphics.Color.WHITE); // Белый цвет для виджета
      this.floatingView.setBackground(shape);

      // Устанавливаем padding
      const padding = 15; // Уменьшаем padding
      this.floatingView.setPadding(padding, padding, padding, padding);

      // Параметры окна - делаем виджет меньшим
      const size = this.widgetSize; // фиксированный размер в пикселях
      
      this.params = new android.view.WindowManager.LayoutParams(
        size,
        size,
        android.os.Build.VERSION.SDK_INT >= 26 
          ? android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY 
          : android.view.WindowManager.LayoutParams.TYPE_PHONE,
        android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
        android.graphics.PixelFormat.TRANSLUCENT
      );

      // Устанавливаем позицию виджета
      this.params.x = x;
      this.params.y = y;
      this.currentWidgetX = x;
      this.currentWidgetY = y;

      // Добавляем обработчик перетаскивания
      this.floatingView.setOnTouchListener(new android.view.View.OnTouchListener({
        onTouch: (view, event) => {
          const action = event.getAction();
          switch (action) {
            case android.view.MotionEvent.ACTION_DOWN:
              this.initialX = this.params.x;
              this.initialY = this.params.y;
              this.initialTouchX = event.getRawX();
              this.initialTouchY = event.getRawY();
              this.resetInactivityTimer(); // Сброс таймера при взаимодействии
              return true;

            case android.view.MotionEvent.ACTION_MOVE:
              this.params.x = this.initialX + (event.getRawX() - this.initialTouchX);
              this.params.y = this.initialY + (event.getRawY() - this.initialTouchY);
              try {
                this.windowManager.updateViewLayout(this.floatingView, this.params);
                // Обновляем текущую позицию виджета
                this.currentWidgetX = this.params.x;
                this.currentWidgetY = this.params.y;
              } catch (e) {
                console.error("Error updating layout:", e);
              }
              return true;

            case android.view.MotionEvent.ACTION_UP:
              const currentTime = new Date().getTime();
              if (currentTime - this.lastTouchTime < 300) { // Двойной клик
                this.toggleLock(); // Переключение состояния при двойном нажатии
              }
              this.lastTouchTime = currentTime; // Обновляем время последнего касания
              return true;
          }
          return false;
        }
      }));

      // Добавляем виджет
      console.log("Adding widget on top...");
      this.windowManager.addView(this.floatingView, this.params);
      this.startInactivityTimer(); // Запуск таймера бездействия
    } catch (error) {
      console.error("Error creating widget:", error);
    }
  }

  private createFloatingWidget(): void {
    try {
      const context = Utils.android.getApplicationContext();
      console.log("Getting window manager...");
      this.windowManager = context.getSystemService(android.content.Context.WINDOW_SERVICE);

      const displayMetrics = context.getResources().getDisplayMetrics();
      // Устанавливаем начальную позицию в центр экрана
      const x = (displayMetrics.widthPixels - this.widgetSize) / 2;
      const y = (displayMetrics.heightPixels - this.widgetSize) / 2;
      
      this.createWidget(x, y);
    } catch (error) {
      console.error("Error in createFloatingWidget:", error);
      throw error;
    }
  }

  private hideOverlay(): void {
    if (this.overlayView) {
      try {
        // Удаляем само наложение
        this.windowManager.removeView(this.overlayView);
        this.overlayView = null;
      } catch (e) {
        console.error('Error removing overlay:', e);
      }
    }
  }

  private startInactivityTimer(): void {
    this.inactivityTimer = setTimeout(() => {
      this.floatingView.setAlpha(0.5); // Полупрозрачный
    }, 3000); // 3 секунды
  }

  private resetInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.floatingView.setAlpha(1); // Вернуть непрозрачность
      this.startInactivityTimer(); // Запустить таймер снова
    }
  }
} 