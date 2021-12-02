import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Settings } from '../settings';
import { SettingsService } from '../settings.service';

@Component({
  selector: 'app-configuration',
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.scss']
})
export class ConfigurationComponent implements OnInit {

  /** Aktuelle Konfiguration */
  config: Settings;

  /** Aktueller Sender */
  station: string = "";

  /** Subscription für die Routenänderung */
  private sub: any;

  /** Konstruktion */
  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    public settings: SettingsService,
  ) {
    this.config = settings.currentSettings;
   }

  /** Initialisierung */
  ngOnInit(): void {
    this.sub = this.route.params.subscribe(params => {
      this.station = params['station_name'];
      if (params['config']) {
        try {
          this.settings.setSettingsFromBase64(params['config']);
        } catch (error) {

        }
      }
    });
  }

  getPlayerLink(): string {
    return document.location.origin + '/' + this.station + '/' + this.settings.getBase64Settings();
  }

}
