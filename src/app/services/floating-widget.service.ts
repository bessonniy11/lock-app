import { Injectable } from '@angular/core';
import { Utils } from '@nativescript/core';
import { BehaviorSubject } from 'rxjs';

declare const android: any;
declare const com: any;
declare const java: any;

@Injectable({
  providedIn: 'root'
})
export class FloatingWidgetService {
  private floatingViews: any[] = []; // Массив для хранения виджетов
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
  private deleteArea: any = null; // Область для удаления виджета
  public hasWidget$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false); // Используем BehaviorSubject

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
      const widget = this.createFloatingWidget();
      this.floatingViews.push(widget); // Добавляем виджет в массив
      console.log("Widget created successfully");
      this.hasWidget$.next(true); // Обновляем состояние
      return true;
    } catch (error) {
      console.error("Error creating widget:", error);
      return false;
    }
  }

  public hideFloatingWidget(): void {
    this.removeLastFloatingWidget(); // Удаляем только последний виджет
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
    const lastWidget = this.floatingViews[this.floatingViews.length - 1]; // Получаем последний виджет
    if (lastWidget) {
        lastWidget.setText(this.isLocked ? "🔒" : "🔓"); // Изменение текста

        if (this.isLocked) {
            // 1. Сохраняем текущую позицию виджета
            const currentX = this.params.x;
            const currentY = this.params.y;

            // 2. Показываем наложение
            this.showSimpleOverlay();

            // 3. Удаляем старый виджет
            try {
                this.windowManager.removeView(lastWidget);
                this.floatingViews.pop(); // Удаляем виджет из массива
            } catch (e) {
                console.error('Error removing floating widget', e);
            }

            // 4. Пересоздаем виджет с той же позицией
            this.createWidget(currentX, currentY);
        } else {
            this.hideOverlay(); // Скрываем наложение
        }
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

  private createWidget(x: number, y: number): any {
    try {
      const context = Utils.android.getApplicationContext();
      
      // Получаем высоту экрана
      const displayMetrics = context.getResources().getDisplayMetrics();
      const screenHeight = displayMetrics.heightPixels;

      // Создаем TextView для виджета
      const floatingView = new android.widget.TextView(context);
      
      // Устанавливаем текст и стили в зависимости от состояния isLocked
      floatingView.setText(this.isLocked ? "🔒" : "🔓"); // Устанавливаем текст замочка
      floatingView.setTextSize(25);
      floatingView.setTextColor(android.graphics.Color.BLACK); // Черный цвет текста
      floatingView.setGravity(android.view.Gravity.CENTER); // Центрируем текст

      // Создаем круглый фон
      const shape = new android.graphics.drawable.GradientDrawable();
      shape.setShape(android.graphics.drawable.GradientDrawable.OVAL);
      shape.setColor(android.graphics.Color.WHITE); // Белый цвет для виджета
      shape.setStroke(2, android.graphics.Color.GRAY); // Добавляем обводку, если нужно

      floatingView.setBackground(shape);

      // Устанавливаем padding
      const padding = 15; // Уменьшаем padding
      floatingView.setPadding(padding, padding, padding, padding);

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
      floatingView.setOnTouchListener(new android.view.View.OnTouchListener({
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
                this.windowManager.updateViewLayout(floatingView, this.params);
                // Обновляем текущую позицию виджета
                this.currentWidgetX = this.params.x;
                this.currentWidgetY = this.params.y;

                // Проверяем, находится ли виджет в области удаления (80% высоты экрана) и не заблокирован
                const widgetHeightThreshold = screenHeight * 0.3; // 30% высоты экрана
                if (event.getRawY() < widgetHeightThreshold && !this.isLocked) { // Если виджет близко к верхнему краю и не заблокирован
                  this.showDeleteArea(); // Показываем область удаления
                } else {
                  this.hideDeleteArea(); // Скрываем область удаления
                }
              } catch (e) {
                console.error("Error updating layout:", e);
              }
              return true;

            case android.view.MotionEvent.ACTION_UP:
              const currentTime = new Date().getTime();
              if (currentTime - this.lastTouchTime < 300) { // Двойной клик
                this.toggleLock(); // Переключение состояния при двойном нажатии
              } else if (event.getRawY() < 200 && !this.isLocked) { // Если отпустили в области удаления и не заблокирован
                this.removeLastFloatingWidget(); // Удаляем виджет
              }
              this.lastTouchTime = currentTime; // Обновляем время последнего касания
              this.hideDeleteArea(); // Скрываем область удаления
              return true;
          }
          return false;
        }
      }));

      // Добавляем виджет
      console.log("Adding widget on top...");
      this.windowManager.addView(floatingView, this.params);
      this.startInactivityTimer(); // Запуск таймера бездействия
      this.floatingViews.push(floatingView); // Добавляем виджет в массив
      return floatingView; // Возвращаем созданный виджет
    } catch (error) {
      console.error("Error creating widget:", error);
      return null;
    }
  }

  private createFloatingWidget(): any {
    try {
      const context = Utils.android.getApplicationContext();
      console.log("Getting window manager...");
      this.windowManager = context.getSystemService(android.content.Context.WINDOW_SERVICE);

      const displayMetrics = context.getResources().getDisplayMetrics();
      // Устанавливаем начальную позицию в центр экрана
      const x = (displayMetrics.widthPixels - this.widgetSize) / 2;
      const y = (displayMetrics.heightPixels - this.widgetSize) / 2;
      
      return this.createWidget(x, y);
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
    // Сначала очищаем предыдущий таймер, если он был
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    
    // Только если виджет существует, создаем таймер
    if (this.floatingViews.length > 0) {
      this.inactivityTimer = setTimeout(() => {
        // Дополнительная проверка перед изменением прозрачности
        if (this.floatingViews.length > 0) {
          const lastWidget = this.floatingViews[this.floatingViews.length - 1];
          if (lastWidget) {
            lastWidget.setAlpha(0.5); // Полупрозрачный
          }
        }
      }, 3000); // 3 секунды
    }
  }

  private resetInactivityTimer(): void {
    // Только если виджет существует
    if (this.floatingViews.length > 0) {
      const lastWidget = this.floatingViews[this.floatingViews.length - 1];
      if (lastWidget && this.inactivityTimer) {
        clearTimeout(this.inactivityTimer);
        lastWidget.setAlpha(1); // Вернуть непрозрачность
        this.startInactivityTimer(); // Запустить таймер снова
      }
    }
  }

  public removeLastFloatingWidget(): void {
    // console.log("Removing last floating widget");
    if (this.floatingViews.length > 0) {
        const lastWidget = this.floatingViews.pop(); // Получаем последний виджет
        if (lastWidget) {
            try {
                this.windowManager.removeView(lastWidget); // Удаляем виджет из WindowManager
                this.hasWidget$.next(false); // Обновляем состояние
                console.log("Last widget removed successfully");
            } catch (e) {
                console.error('Error removing last floating widget', e);
            }
        }
    } else {
        console.log("No floating widgets to remove");
    }
  }

  public removeAllFloatingWidgets(): void {
    console.log("Removing all floating widgets");
    while (this.floatingViews.length > 0) {
        this.removeLastFloatingWidget(); // Удаляем последний виджет, пока не очистим массив
    }
  }

  // Метод для проверки, существует ли уже виджет
  public hasActiveWidget(): boolean {
    return this.floatingViews.length > 0;
  }

  private showDeleteArea(): void {
    if (!this.deleteArea) {
        const context = Utils.android.getApplicationContext();
        this.deleteArea = new android.widget.RelativeLayout(context); // Используем RelativeLayout для deleteArea
        this.deleteArea.setBackgroundColor(android.graphics.Color.WHITE); // Белый цвет для области удаления

        // Создаем параметры для области удаления
        const params = new android.view.WindowManager.LayoutParams(
            android.view.WindowManager.LayoutParams.MATCH_PARENT,
            100, // Высота области удаления
            android.os.Build.VERSION.SDK_INT >= 26 
                ? android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY 
                : android.view.WindowManager.LayoutParams.TYPE_PHONE,
            android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            android.graphics.PixelFormat.TRANSLUCENT
        );

        // Устанавливаем ширину 80% от ширины экрана и центрируем
        const displayMetrics = context.getResources().getDisplayMetrics();
        const screenWidth = displayMetrics.widthPixels;
        params.width = Math.round(screenWidth * 0.6); // 60% ширины экрана
        params.gravity = android.view.Gravity.TOP | android.view.Gravity.CENTER_HORIZONTAL; // Центрируем по горизонтали

        // Устанавливаем отступ сверху
        params.y = 20; // Отступ сверху 10 пикселей

        // Добавляем тень
        this.deleteArea.setElevation(10); // Плавная тень

        // Устанавливаем закругленные края
        const shape = new android.graphics.drawable.GradientDrawable();
        shape.setShape(android.graphics.drawable.GradientDrawable.RECTANGLE);
        shape.setColor(android.graphics.Color.WHITE);
        shape.setCornerRadius(30); // Радиус закругления
        this.deleteArea.setBackground(shape);

        // Создаем TextView для текста "Удалить виджет"
        const textView = new android.widget.TextView(context);
        textView.setText("Удалить виджет");
        textView.setTextColor(android.graphics.Color.BLACK); // Черный цвет текста
        textView.setTextSize(18); // Размер текста
        textView.setGravity(android.view.Gravity.CENTER); // Центрируем текст

        // Устанавливаем отступ сверху
        const layoutParams = new android.widget.RelativeLayout.LayoutParams(
            android.widget.RelativeLayout.LayoutParams.WRAP_CONTENT,
            android.widget.RelativeLayout.LayoutParams.WRAP_CONTENT
        );
        layoutParams.addRule(android.widget.RelativeLayout.CENTER_IN_PARENT); // Центрируем текст в RelativeLayout

        // Добавляем TextView в deleteArea
        this.deleteArea.addView(textView, layoutParams); // Добавляем TextView в deleteArea

        // Добавляем deleteArea в WindowManager
        this.windowManager.addView(this.deleteArea, params);
    }
  }

  private hideDeleteArea(): void {
    if (this.deleteArea) {
      try {
        this.windowManager.removeView(this.deleteArea);
        this.deleteArea = null;
      } catch (e) {
        console.error('Error removing delete area:', e);
      }
    }
  }
} 