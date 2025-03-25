import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptModule } from '@nativescript/angular';
import { FloatingWidgetService } from './services/floating-widget.service';
import { alert } from '@nativescript/core/ui/dialogs';

@Component({
  selector: 'ns-app',
  templateUrl: './app.component.html',
  imports: [NativeScriptModule],
  schemas: [NO_ERRORS_SCHEMA],
  standalone: true
})
export class AppComponent {
  isLoading: boolean = false;
  message: string = '';

  constructor(private floatingWidgetService: FloatingWidgetService) {}

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
    console.log('Hiding floating widget');
    try {
      this.floatingWidgetService.hideFloatingWidget();
      this.message = 'Виджет скрыт';
    } catch (error) {
      console.error('Ошибка при скрытии виджета:', error);
      this.message = 'Ошибка при скрытии виджета: ' + error;
      
      alert({
        title: "Ошибка",
        message: "Произошла ошибка при скрытии виджета: " + error,
        okButtonText: "OK"
      });
    }
  }
}
