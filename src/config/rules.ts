/**
 * Beispiel-Serverregeln. Eigene Regeln am besten im Web-Dashboard (Regeln-Seite)
 * bearbeiten oder als config/rules.json ablegen, danach `/setup-rules post` ausführen.
 *
 * Platzhalter:
 *   {server}      -> Servername
 *   {owner}       -> Erwähnung des Server-Owners laut Discord
 *   {@name}       -> Erwähnung eines Mitglieds per Benutzername, z. B. {@MaxMustermann}
 *                    (der Bot sucht das Mitglied beim Posten; nicht gefunden -> fett geschriebener Name)
 *   {permissions} -> Link zum #berechtigungen-Kanal
 */
export interface RuleItem {
  emoji: string;
  title: string;
  text: string;
}

export interface RulesConfig {
  title: string;
  intro: string;
  rules: RuleItem[];
  consequences: string;
  acceptText: string;
}

/**
 * Eingebaute Beispiel-Regeln. Reihenfolge beim Laden:
 *   1. data/rules.json   (im Web-Dashboard bearbeitet)
 *   2. config/rules.json (eigene Standard-Regeln, nicht im Git-Repo)
 *   3. diese Beispiel-Regeln
 */
export const RULES: RulesConfig = {
  title: "📜 Serverregeln",
  intro:
    "Willkommen auf **{server}**!\n" +
    "Das folgende Regelwerk gilt für **alle Mitglieder** des Servers. " +
    "Bei Verstößen kann das Team Verwarnungen, Timeouts oder Banns aussprechen.",

  rules: [
    {
      emoji: "🤝",
      title: "Respekt",
      text: "Behandle alle Mitglieder freundlich und respektvoll. Beleidigungen, Hetze und Diskriminierung jeglicher Art sind verboten.",
    },
    {
      emoji: "🏷️",
      title: "Namen & Avatare",
      text: "Nutze einen angemessenen Namen und Avatar. Anstößige Inhalte oder das Nachahmen von Teammitgliedern sind nicht erlaubt.",
    },
    {
      emoji: "💬",
      title: "Textkanäle",
      text: "Schreibe passend zum Thema des jeweiligen Kanals. Spam, Flooding und unnötiges Anpingen anderer Mitglieder sind zu unterlassen.",
    },
    {
      emoji: "🎧",
      title: "Sprachkanäle",
      text: "Vermeide laute Störgeräusche und nutze bei Bedarf Push-to-Talk. Gespräche dürfen nur mit Zustimmung aller Anwesenden aufgenommen werden.",
    },
    {
      emoji: "📢",
      title: "Werbung",
      text: "Werbung für eigene Server, Kanäle oder Produkte ist nur nach Absprache mit dem Team ({owner}) erlaubt - auch nicht per Privatnachricht.",
    },
    {
      emoji: "🔒",
      title: "Datenschutz & Sicherheit",
      text: "Teile keine privaten Daten (Adressen, Telefonnummern, Passwörter). Das Team fragt dich **niemals** nach deinem Passwort.",
    },
    {
      emoji: "🛡️",
      title: "Anweisungen des Teams",
      text: "Den Anweisungen von Admins und Moderatoren ist Folge zu leisten. Bei Problemen hilft dir das Ticket-System weiter.",
    },
  ],

  consequences: "Das Team behält sich vor, die Regeln jederzeit anzupassen.",

  acceptText:
    "Mit einem Klick auf **„Regeln akzeptieren“** bestätigst du, dass du die Regeln gelesen hast und dich daran hältst.\n\n" +
    "Danach werden **alle Kanäle** für dich freigeschaltet und du kannst dir in {permissions} deine Benachrichtigungen aussuchen. 🎉",
};
