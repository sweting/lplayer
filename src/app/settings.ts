/**
 * Einstellungsklasse.
 * Repräsentiert alle Einstellungen, die im Player gemacht werden können
 */
export class Settings {

  /** Cover anzeigen */
  public sC: boolean = true;

  /** Gibt an, ob das Icon für Livesendungen angezeigt werden soll */
  public sLI: boolean = true;

  /** Name der aktuell laufenden Senung anzeigen */
  public sCS: boolean = false;

  /** Hintergrundfarbe */
  public cB: string = "rgb(14, 13, 13)";

  /** Overlay-Schriftfarbe */
  public cO: string = "rgba(80, 80, 80, 0.733)";
  
  /** Schriftfarbe */
  public cF: string = "#fafafa";

}
