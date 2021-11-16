import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

declare var DZ: any;

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

  private _songChange: boolean;

  /** Subscription für die Routenänderung */
  private sub: any;
  private intervall: any;

  /** Kosntruktion */
  constructor(
    private http: HttpClient,
    private route: ActivatedRoute
  ) {
    this.coverSrc = '';
    this.currentArtist = '';
    this.currentSong = '';
    this.currentAlbum = '';
    this.configuredStation = '';
    this._songChange = false;
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
  loadStationInfo(): void {
    this.http.get(this.apiURI_laut + 'station/' + this.configuredStation).subscribe((res) => {
      this.lautFMStationInfo = res;
      if (!this.intervall) {
        this.intervall = setInterval(() => {
          this.refreshSonfgInfo();
        }, 10000);
      }
      this.refreshSonfgInfo();
    });
  }

  /** Refresh Song-Info */
  refreshSonfgInfo() {
    this.http.get<any>(this.apiURI_laut + 'station/' + this.configuredStation + '/current_song?t='+Date.now()).subscribe((res) => {
      if (res && res.title) {
        this._songChange = this.currentSong != res.title;
        this.currentSong = res.title;
        this.currentArtist = res.artist.name;

        if (res.album) {
          this.currentAlbum = res.album;
        } else {
          this.currentAlbum = '';
        }

        if (this._songChange) {
          this.loadCover();
        }
      }
    });
  }

  /** Cover laden */
  loadCover(noAlbum: boolean = false) {
    let album = '';
    if (this.currentAlbum != '' && !noAlbum)
      album = 'album:"' + this.currentAlbum + '"';
    DZ.api('/search?q=artist:"' + this.currentArtist + '"track:"' + this.currentSong + '"' + album, (res: any) =>  {
      if (res.data && res.data.length > 0) {
        this.coverSrc = res.data[0].album.cover_medium;
      } else if (!noAlbum) {
        this.loadCover(true); // Nochmal ohne Album versuchen
      }
    });
  }

}
