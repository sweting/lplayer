import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

declare var DZ: any;
declare var IcecastMetadataPlayer: any;

export interface StreamMetaData {
  StreamTitle: string;
  StreamUrl: string;
}


@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit, OnDestroy {

  apiURI_laut = 'https://api.laut.fm/';

  /** Cover-Bild */
  public coverSrc: string;

  public currentArtist: string;

  public currentSong: string;

  public configuredStation: string;

  public currentAlbum: string;

  public lautFMStationInfo: any;

  /** Player-Element */
  public audio: any;

  /** Flag für Songänderung */
  private _songChange: boolean;

  /** Subscription für die Routenänderung */
  private sub: any;

  public player: any = null;

  /** Wenn False, wird kein Update mehr über die LFM-API gemacht! */
  private _songUpdateFromAPI: boolean = true;
  private get songUpdateFromAPI(): boolean {
    return this._songUpdateFromAPI;
  }
  private set songUpdateFromAPI(value: boolean) {
    this._songUpdateFromAPI = value;
    if (value)
      this.refreshSonfgInfoAPI();
  }

  /** Kosntruktion */
  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef
  ) {
    this.coverSrc = '';
    this.currentArtist = '';
    this.currentSong = '';
    this.currentAlbum = '';
    this.configuredStation = '';
    this._songChange = false;
    this.audio = null;
  }


  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }


  ngOnInit(): void {
    this.sub = this.route.params.subscribe(params => {
      this.configuredStation = params['station_name'];

      this.loadStationInfo();
    });


  }

  /** Lädt die Infos zum Sender */
  loadStationInfo() {
    this.http.get(this.apiURI_laut + 'station/' + this.configuredStation).subscribe((res) => {
      this.lautFMStationInfo = res;

      this.refreshSonfgInfoAPI();

      // Hier der Code, um den Stream gescheit auszulesen.
      //'https://suedwelle.stream.laut.fm/suedwelle'
      /*this.audio = new IcecastMetadataPlayer('http://localhost:8080/'+this.lautFMStationInfo.stream_url, {
        onMetadata: this.onMetadataChange.bind(this),
      });*/

      this.player = new Audio(this.lautFMStationInfo.stream_url);

    });
  }

  onPlay() {
    if (this.audio) {
      this.audio.play();
    } else if (this.player) {
      this.player.play();
    }
  }

  onStop() {
    if (this.audio) {
      this.audio.stop();
      if (!this.songUpdateFromAPI)
        this.songUpdateFromAPI = true;
    } else if (this.player) {
      this.player.pause();
    }
  }


  /** Refresh Song-Info */
  refreshSonfgInfoAPI() {
    if (!this.songUpdateFromAPI)
    {
      return;
    }

    this.http.get<any>(this.apiURI_laut + 'station/' + this.configuredStation + '/current_song?t=' + Date.now()).subscribe((res) => {
      if (res && res.title) {

        if (res.album) {
          this.updateSongInfoGUI(res.title, res.artist.name, res.album);
        } else {
          this.updateSongInfoGUI(res.title, res.artist.name);
        }

        // Nächsten Abruf timen (2021-11-18 19:54:14 +0100)
        // Datum manuell parsen, da kein Standardformat und von Browsersprache abhängig
        // TODO: Zeitzone mit berücksichtigen
        const sstr = new String(res.ends_at);
        const matches = sstr.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})\s([0-9]{2}):([0-9]{2}):([0-9]{2}).*?$/);
        var next = 10000;
        if (matches) {
          const endDate = new Date(
            Number(matches[1]),
            Number(matches[2])-1, // Monat ist 0 indexiert
            Number(matches[3]),
            Number(matches[4]),
            Number(matches[5]),
            Number(matches[6])
          );

          next = (endDate.getTime() - Date.now()) + 3000;
        }

        console.log(next);
        if (next) {
          setTimeout(() => {
            this.refreshSonfgInfoAPI();
          }, next);
        }
      }
    });
  }

  /**
   * Wird aufgerufen, wenn sich die Metadaten am aktuellen Stream
   * ändern.
   * @param metadata Metadatenobjekt
   */
   onMetadataChange(metadata: StreamMetaData) {
    this.songUpdateFromAPI = false;
    //console.log(metadata.StreamTitle);

    const matches = metadata.StreamTitle.match(/^(.*)\s+-\s+(.*)/);
    if (null != matches) {
      this.updateSongInfoGUI(matches[2], matches[1]);
    } else {
      // Kein Regulärer Titel, dann einfach nur anzeigen
      this.currentSong = metadata.StreamTitle;
      this.currentArtist = '';
      this.cd.detectChanges();
    }
  }

  /**
   * Aktualisiert die Songinformationen auf der Oberfläche.
   * Um unnötig API-Anfragen zu verhindern, wird geprüft, ob das
   * @param song Songtitel
   * @param artist Künstler
   * @param album Album sonst = ''
   */
  updateSongInfoGUI(song: string, artist: string, album: string = '')
  {
    if (this.currentArtist != artist || this.currentSong != song)
    {
      this.currentSong = song;
      this.currentArtist = artist;
      this.loadCover();
      this.cd.detectChanges();
    }
    this.currentAlbum = album;
  }

  /**
   * Versucht mittels Deezer ein Cover zu dem aktuell
   * laufenden Song zu laden.
   * @param noAlbum Kein Album in der Suche verwenden
   */
  loadCover(noAlbum: boolean = false) {
    let param_album = '';
    if (this.currentAlbum != '' && !noAlbum)
    param_album = 'album:"' + this.currentAlbum + '"';
    DZ.api('/search?q=artist:"' + this.currentArtist + '"track:"' + this.currentSong + '"' + param_album, (res: any) =>  {
      if (res.data && res.data.length > 0) {
        this.coverSrc = res.data[0].album.cover_medium;
        this.cd.detectChanges();
      } else if (!noAlbum) {
        this.loadCover(true); // Nochmal ohne Album versuchen
      } else {
        this.coverSrc = '';
        return;
      }
    });
  }

}
