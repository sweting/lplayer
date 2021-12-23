import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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

  /** Höhe des Iframes */
  frameWidth: number = 300;

  /** Breite des Iframes */
  frameHeight: number = 300;

  /** Gibt an, ob sich der Frame an die Bildschirmbreite anpasst */
  frameFullWidth: boolean = false;

  /** Subscription für die Routenänderung */
  private sub: any;

  /** Konstruktion */
  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    public settings: SettingsService,
    private sanitizer: DomSanitizer,
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

  getFrameUri(): SafeResourceUrl {
    var uri =  document.location.origin + '/' + this.station + '/frame/' + this.settings.getBase64Settings();
    return this.sanitizer.bypassSecurityTrustResourceUrl(uri);
  }

  getFrameHTML(): string {
    var uri =  document.location.origin + '/' + this.station + '/frame/' + this.settings.getBase64Settings();
    if (this.frameFullWidth)
    {
      return '<iframe src="'+uri+'" width="100%" height="'+this.frameHeight+'" style="border: none;"></iframe>';
    }
    else 
    {
      return '<iframe src="'+uri+'" width="'+this.frameWidth+'" height="'+this.frameHeight+'" style="border: none;"></iframe>';
    }
  }

}
