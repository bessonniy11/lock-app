import { Component, NO_ERRORS_SCHEMA, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { NativeScriptModule } from '@nativescript/angular';
import { FloatingWidgetService } from './services/floating-widget.service';
import { alert } from '@nativescript/core/ui/dialogs';
import { Subscription } from 'rxjs';

@Component({
  selector: 'ns-app',
  templateUrl: './app.component.html',
  imports: [NativeScriptModule],
  schemas: [NO_ERRORS_SCHEMA],
  standalone: true
})
export class AppComponent implements OnDestroy {
  isLoading: boolean = false;
  message: string = '';
  hasWidget: boolean = false;
  private widgetSubscription: Subscription;

  constructor(private floatingWidgetService: FloatingWidgetService, private cdr: ChangeDetectorRef) {
    this.widgetSubscription = this.floatingWidgetService.hasWidget$.subscribe(hasActive => {
      // console.log('hasActive', hasActive);
      this.hasWidget = hasActive; // Обновляем локальное состояние
      // console.log('this.hasWidget ', this.hasWidget);
      this.cdr.detectChanges(); // Вызываем обнаружение изменений
      if (!this.hasWidget) {
        this.message = 'Виджет удалён успешно!';
      }
    });
  }

  ngOnDestroy() {
    this.widgetSubscription.unsubscribe(); // Отписываемся при уничтожении компонента
  }

  showFloatingWidget(): void {
    this.isLoading = true;
    this.message = 'Создаем виджет...';
    
    console.log('Calling showFloatingWidget()');
    this.floatingWidgetService.showFloatingWidget().then(success => {
      this.isLoading = false;
      
      if (!success) {
        this.message = 'Требуется разрешение на отображение поверх других приложений';
        console.log('Требуется разрешение на отображение поверх других приложений');
        
        alert({
          title: "Не удалось создать виджет",
          message: "Предоставьте разрешение на отображение поверх других приложений и попробуйте снова.",
          okButtonText: "OK"
        });
      } else {
        this.message = 'Виджет создан успешно!';
        console.log('Виджет создан успешно');
      }
    }).catch(error => {
      this.isLoading = false;
      this.message = 'Ошибка: ' + error;
      console.error('Ошибка создания виджета:', error);
      
      alert({
        title: "Ошибка",
        message: "Произошла ошибка при создании виджета: " + error,
        okButtonText: "OK"
      });
    });
  }

  hideFloatingWidget(): void {
    console.log('Removing floating widget');
    try {
      this.floatingWidgetService.removeAllFloatingWidgets();
      this.message = 'Виджет удален';
    } catch (error) {
      console.error('Ошибка при удалении виджета:', error);
      this.message = 'Ошибка при удалении виджета: ' + error;
      
      alert({
        title: "Ошибка",
        message: "Произошла ошибка при удалении виджета: " + error,
        okButtonText: "OK"
      });
    }
  }
}
