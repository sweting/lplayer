import { Injectable } from '@angular/core';
import { Settings } from './settings';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  /** Aktuelle Einstellungen des Players/Frames */
  public currentSettings: Settings = new Settings();

  /** Liefert die Einstellungen als Base64 */
  public getBase64Settings(): string {
    return  btoa(JSON.stringify(this.currentSettings));
  }

  public setSettingsFromBase64(value: string) {
    this.currentSettings = Object.assign(this.currentSettings, JSON.parse(atob(value)));
  }

  constructor() { }


}
