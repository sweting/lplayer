import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';

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

  public lautFMStationInfo: any;

  /** Player-Element */
  public audio: any;

  /** Flag für Songänderung */
  private _songChange: boolean;

  /** Adresse des aktuellen Audiostreams */
  public currentStreamSrc: string;

  /** Der HTML5-Standardplayer */
  public HTML5player: any = null;

  /** Status des Players */
  public playerState: PlayerState;

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

  /** Subscription für die Routenänderung */
  private sub: any;

  /** Icon muss geändert werden können */
  private favIcon: HTMLLinkElement | null = document.querySelector('#appIcon');

  /** Kosntruktion */
  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef,
    private titleServ: Title
  ) {
    this.coverSrc = '';
    this.currentArtist = '';
    this.currentSong = '';
    this.currentAlbum = '';
    this.configuredStation = '';
    this.currentStreamSrc = ' ';
    this._songChange = false;
    this.audio = null;
    this.playerState = PlayerState.stopped;
  }


  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  /**
   * Initislisierung der Ansicht
   */
  ngOnInit(): void {
    this.sub = this.route.params.subscribe(params => {
      this.configuredStation = params['station_name'];

      this.loadStationInfo();
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

        // Hier der Code, um den Stream gescheit auszulesen.
        //'https://suedwelle.stream.laut.fm/suedwelle'
        /*this.audio = new IcecastMetadataPlayer('http://localhost:8080/'+this.lautFMStationInfo.stream_url, {
          onMetadata: this.onMetadataChange.bind(this),
        });*/

        // Die Stream-Resource wird geladen, sobald auf Play gedrückt wird
        this.HTML5player = new Audio(' ');

        // Mediensteuerung des PCs unterstützen
        this.intitMediaSession();
      }

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

        const mediaElement = res.data[0]; // Verwendetes Ergebnis aus der API

        this.coverSrc = mediaElement.album.cover_medium;

        var images = [
          { src: mediaElement.album.cover_small, sizes: '56x56', type: 'image/jpg' },
          { src: mediaElement.album.cover_medium, sizes: '250x250', type: 'image/jpg' },
          { src: mediaElement.album.cover_big, sizes: '500x500', type: 'image/jpg' },
          { src: mediaElement.album.cover_xl, sizes: '1000x1000', type: 'image/jpg' },
        ];

        this.updateSongInfoMediaSession(images);
        this.cd.detectChanges();
      } else if (!noAlbum) {
        this.loadCover(true); // Nochmal ohne Album versuchen
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
