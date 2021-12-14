import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { SettingsService } from '../settings.service';

declare var DZ: any;
declare var IcecastMetadataPlayer: any;
declare var MediaMetadata: any;
declare var navigator: any;
declare var MediaImage: any;
declare var MediaSessionActions: any;

/** Definition wie die Stream-Metadaten aussehen, die aus der Lib kommen */
export interface StreamMetaData {
  StreamTitle: string;
  StreamUrl: string;
}

/** Status des Players */
export enum PlayerState {
  stopped = 'stopped',
  playing = 'playing',
  loading = 'loading',
  error = 'error'
}


@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss'],
})
export class OverviewComponent implements OnInit, OnDestroy {

  apiURI_laut = 'https://api.laut.fm/';

  /** Cover-Bild */
  public coverSrc: string;

  public currentArtist: string;

  public currentSong: string;

  public configuredStation: string;

  public currentAlbum: string;

  /** Gibt an, ob gerade live gesendet wird */
  public liveStatus: boolean;

  /** Stationsdaten aus er LautFM-API */
  public lautFMStationInfo: any;

  /**
   * Gibt an, ob der Playout über dei icecast-metadata-lib erfolgen
   * soll und die Metadaten (aktueller Song) direkt aus dem Stream gelesen werden.
   */
  public IceCaseDirect: boolean = false;

  /** Player-Element */
  public audio: any;

  /** Adresse des aktuellen Audiostreams */
  public currentStreamSrc: string;

  /** Der HTML5-Standardplayer */
  public HTML5player: any = null;

  /** Status des Players */
  public playerState: PlayerState;

  /** Flag für Songänderung */
  private _songChange: boolean;


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

  /** Lautstärke an den jeweiligen Player durchreiceh */
  public get volume(): number | null {
    if (this.audio) {
      return this.audio.audioElement.volume;
    } else if (this.HTML5player) {
      return this.HTML5player.volume;
    }
    return 1;
  }
  public set volume(val: number | null) {
    if (this.audio) {
      this.audio.audioElement.volume = val;
    } else if (this.HTML5player) {
      this.HTML5player.volume = val;
    }
  }
  /** Flag, dass die Anzeige des Lautsärkenreglers bestimmt */
  public showVolumeSlider: boolean = false;

  /** Subscription für die Routenänderung */
  private sub: any;

  /** Icon muss geändert werden können */
  private favIcon: HTMLLinkElement | null;

  /** Kosntruktion */
  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef,
    private titleServ: Title,
    public settings: SettingsService,
    @Inject(DOCUMENT) private readonly document: any
  ) {
    this.coverSrc = '';
    this.currentArtist = '';
    this.currentSong = '';
    this.currentAlbum = '';
    this.liveStatus = false;
    this.configuredStation = '';
    this.currentStreamSrc = ' ';
    this._songChange = false;
    this.audio = null;
    this.playerState = PlayerState.stopped;
    this.favIcon = document.querySelector('#appIcon');
  }


  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  /**
   * Initislisierung der Ansicht
   */
  ngOnInit(): void {
    // Werte die übergebenen Routen-Parameter aus
    this.sub = this.route.params.subscribe(params => {
      this.configuredStation = params['station_name'];

      if (params['config']) {
        try {
          this.settings.setSettingsFromBase64(params['config']);
        } catch (error) {

        }
      }

      // Rountingdaten abfragen
      this.route.data.subscribe(data => {
        this.IceCaseDirect = data.icecastMeta;
        this.loadStationInfo();
      });
    });


  }

  /**
   * Wenn verfügbar die Mediensteuerung registrieren
   */
  intitMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => { this.onPlay(); });
      navigator.mediaSession.setActionHandler('pause', () => { this.onStop(); });
      navigator.mediaSession.setActionHandler('stop', () => { this.onStop(); });
      navigator.mediaSession.playbackState = 'paused';
    }
  }

  /** Lädt die Infos zum Sender */
  loadStationInfo() {
    this.http.get(this.apiURI_laut + 'station/' + this.configuredStation).subscribe((res) => {
      this.lautFMStationInfo = res;

      if (this.lautFMStationInfo && this.lautFMStationInfo.stream_url)
      {
        this.refreshSonfgInfoAPI();

        this.currentStreamSrc = this.lautFMStationInfo.stream_url;

        // Browsertitel und Icon
        this.titleServ.setTitle(this.lautFMStationInfo.display_name + ' | Lplayer');
        if (this.favIcon)
        {
          this.favIcon.href = this.lautFMStationInfo.images.station_80x80;
        }

        // Den Icecastplayer nur erst jetzt laden
        if (this.IceCaseDirect)
        {
          if ('undefined' == typeof IcecastMetadataPlayer) {
            const script = this.document.createElement('script');
            script.type = 'text/javascript';
            script.async = true;
            script.src = 'assets/icecast-metadata-player-1.10.3.min.js';
            script.onload = () => {
              this.loadIcecasplayer();
            };

            this.document.body.appendChild(script);
          } else {
            this.loadIcecasplayer();
          }
        } else
        {
          // Die Stream-Resource wird geladen, sobald auf Play gedrückt wird
          this.HTML5player = new Audio(' ');
        }

        // Mediensteuerung des PCs unterstützen
        this.intitMediaSession();
      }

    });
  }


  loadIcecasplayer() {
    // Hier der Code, um den Stream gescheit auszulesen.
    //'https://suedwelle.stream.laut.fm/suedwelle'
    this.audio = new IcecastMetadataPlayer(/*'http://localhost:8080/'+*/this.lautFMStationInfo.stream_url, {
      onMetadata: this.onMetadataChange.bind(this),
    });
  }

  /**
   * Starte den aktuellen Audio-Stream
   */
  onPlay() {
    if (this.audio) {
      this.audio.play();
      this.playerState = PlayerState.playing;
    } else if (this.HTML5player) {
      this.HTML5player.src = ' ';
      this.HTML5player.src = this.currentStreamSrc;
      this.HTML5player.play();
      this.playerState = PlayerState.playing;
      this.intitMediaSession();
    }

    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
    }

    this.cd.detectChanges();
  }

  /**
   * Stoppe den aktuellen Audio-Stream
   */
  onStop() {
    if (this.audio) {
      this.audio.stop();
      if (!this.songUpdateFromAPI)
        this.songUpdateFromAPI = true;

        this.playerState = PlayerState.stopped;
    } else if (this.HTML5player) {
      this.HTML5player.pause();
      this.playerState = PlayerState.stopped;
    }

    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }

    this.cd.detectChanges();
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

        this.liveStatus = res.live;

        // Nächsten Abruf timen (2021-11-18 19:54:14 +0100)
        // Datum manuell parsen, da kein Standardformat und von Browsersprache abhängig
        // TODO: Zeitzone mit berücksichtigen
        const sstr = new String(res.ends_at);
        const matches = sstr.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})\s([0-9]{2}):([0-9]{2}):([0-9]{2})\s([+\-]\d{2}).*?$/);
        var next = 10000;
        if (matches) {
          const endDate = new Date();
          endDate.setUTCFullYear(
            Number(matches[1]),
            Number(matches[2]) - 1, // Monat ist 0 indexiert
            Number(matches[3])
          );
          endDate.setUTCHours(
            Number(matches[4]) + (Number(matches[7])*-1),
            Number(matches[5]),
            Number(matches[6])
          );

          next = (endDate.getTime() - Date.now()) + 300;
        }

        console.log(next);
        if (next < 300) {
          next = 10000;   // Wenn die Berechnung falsch läuft wird ein 10 Sekunden-Intervall verwendet
        }
        if (next) {
          setTimeout(() => {
            this.refreshSonfgInfoAPI();
          }, next);
        }
      }
    }, (error) => {
      console.log('Songinfo mit Fehler', error);
      setTimeout(() => {
        this.refreshSonfgInfoAPI();
      }, 10000);
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
   * Aktualisiert die Songinfos in der MediaSession.
   * Wird von der loadCover-Methode aufgerufen, damit auch das Cover entsprechend dabei ist.
   */
  updateSongInfoMediaSession(artwork: any[]) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.currentSong,
        artist: this.currentArtist,
        album: this.lautFMStationInfo.display_name,
        artwork: artwork
      });
    }
  }

  /**
   * Initialisiert die Deezer-API, um die Cover anzeigen zu können.
   * Hierzu wird das Javascript von Deezer eingebunden
   * @param noAlbum Kein Album in der Suche verwenden
   */
  loadCover(noAlbum: boolean = false)
  {
    // Coveranzeige deaktiviert
    if (!this.settings.currentSettings.sC)
    {
      this.coverSrc = '';

      var images = [
        { src: this.lautFMStationInfo.images.station_80x80,   sizes: '80x80',   type: 'image/png' },
        { src: this.lautFMStationInfo.images.station_120x120, sizes: '120x120', type: 'image/png' },
        { src: this.lautFMStationInfo.images.station_640x640, sizes: '640x640', type: 'image/png' },
      ];
      this.updateSongInfoMediaSession(images);
      this.cd.detectChanges();
      return;
    }

    if ('undefined' == typeof DZ) {
      const script = this.document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = 'https://e-cdns-files.dzcdn.net/js/min/dz.js';
      script.onload = () => {
        this.loadCoverFromDeezer(noAlbum);
      };

      this.document.body.appendChild(script);
    } else {
      this.loadCoverFromDeezer(noAlbum);
    }
  }

  /**
   * Versucht mittels Deezer ein Cover zu dem aktuell
   * laufenden Song zu laden. Diese Methode kann erst nach der Initialisierung des Deezer-Service aufgerufen werden
   * @param noAlbum Kein Album in der Suche verwenden
   */
   private loadCoverFromDeezer(noAlbum: boolean = false) {
    let param_album = '';
    if (this.currentAlbum != '' && !noAlbum)
    param_album = 'album:"' + this.currentAlbum + '"';
    DZ.api('/search?q=artist:"' + this.currentArtist + '"track:"' + this.currentSong + '"' + param_album, (res: any) =>  {
      if (res.data && res.data.length > 0) {

        const mediaElement = res.data[0]; // Verwendetes Ergebnis aus der API

        this.coverSrc = mediaElement.album.cover_big;

        var images = [
          { src: mediaElement.album.cover_small, sizes: '56x56', type: 'image/jpg' },
          { src: mediaElement.album.cover_medium, sizes: '250x250', type: 'image/jpg' },
          { src: mediaElement.album.cover_big, sizes: '500x500', type: 'image/jpg' },
          { src: mediaElement.album.cover_xl, sizes: '1000x1000', type: 'image/jpg' },
        ];

        this.updateSongInfoMediaSession(images);
        this.cd.detectChanges();
      } else if (!noAlbum) {
        this.loadCoverFromDeezer(true); // Nochmal ohne Album versuchen
      } else {
        this.coverSrc = '';

        var images = [
          { src: this.lautFMStationInfo.images.station_80x80,   sizes: '80x80',   type: 'image/png' },
          { src: this.lautFMStationInfo.images.station_120x120, sizes: '120x120', type: 'image/png' },
          { src: this.lautFMStationInfo.images.station_640x640, sizes: '640x640', type: 'image/png' },
        ];

        this.updateSongInfoMediaSession(images);
        this.cd.detectChanges();
      }
    });
  }

}
