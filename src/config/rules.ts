/**
 * Serverregeln von Germany LanGame - hier kannst du die Texte frei anpassen.
 * Danach hochladen und `/setup-rules post` ausführen.
 *
 * Platzhalter:
 *   {server}      -> Servername
 *   {owner}       -> Erwähnung des Server-Owners laut Discord
 *   {@name}       -> Erwähnung eines Mitglieds per Benutzername, z. B. {@mops4ever}
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
 * Standard-Regeln. Werden die Regeln im Web-Dashboard bearbeitet, landen sie in
 * data/rules.json und haben Vorrang vor diesen Standardwerten.
 */
export const RULES: RulesConfig = {
  title: "📜 Serverregeln",
  intro:
    "Dies sind die aktuellen Discord-Regeln von **{server}**.\n" +
    "Das folgende Regelwerk gilt für **alle Nutzer** des Servers und ist immer zu beachten. " +
    "Bei Missachtung gibt es entsprechende Konsequenzen.",

  rules: [
    {
      emoji: "🏷️",
      title: "Namensgebung",
      text:
        "• Wir bitten jeden User, in Discord den gleichen Nickname wie Ingame zu nutzen. Das dient der Übersichtlichkeit *(keine Pflicht)*.\n" +
        "• Sogenannte Fake-Namen sind verboten.\n" +
        "• Nicknames dürfen keine beleidigenden, menschenfeindlichen, rassistischen, sexistischen, pornografischen, nationalsozialistischen, urheberrechtlich geschützten oder diskriminierenden Inhalte haben.\n" +
        "• Unzulässige Nicknames führen zu einem Timeout oder Bann.",
    },
    {
      emoji: "🗣️",
      title: "Gespräche stören",
      text:
        "User, die Gespräche absichtlich stören und auch nach mehrmaligem Ermahnen keine Einsicht zeigen, müssen mit einem Channel- oder Server-Kick rechnen. " +
        "In uneinsichtigen Fällen werden temporäre Banns verhängt - bis hin zum permanenten Bann.",
    },
    {
      emoji: "🤬",
      title: "Beleidigungen",
      text:
        "Es gilt die allgemeine Netiquette. Wer keinen vernünftigen Umgangston beherrscht und andere User beleidigt - ob direkt oder subtil -, muss mit den Konsequenzen leben.",
    },
    {
      emoji: "🎧",
      title: "Geräusche",
      text:
        "Obszöne Geräusche oder Rauschen des Headsets sind zu unterlassen. Stell dein Mikro bitte so ein, dass deine Atmung nicht dauerhaft zu hören ist. " +
        "Wenn du nebenbei isst und nichts zu sagen hast, schalte dein Mikro bitte stumm.",
    },
    {
      emoji: "🔀",
      title: "Channel-Hopping",
      text: "…ist verboten. Also nicht einfach ständig zwischen den Channels hin- und herwechseln. Wer dagegen verstößt, fliegt.",
    },
    {
      emoji: "🔔",
      title: "Discord-Rechte",
      text: "Deine Rollen und Benachrichtigungen kannst du selbst in {permissions} auswählen.",
    },
    {
      emoji: "🤝",
      title: "Streitigkeiten",
      text: "Private Missverständnisse und Streitigkeiten sind privat zu klären und gehören nicht auf den Server.",
    },
    {
      emoji: "🛡️",
      title: "Weisungsrecht",
      text:
        "Die Admins haben auf dem Server volles Weisungsrecht. Wer den Anweisungen der Admins nicht folgt, wird verwarnt und im Ernstfall gekickt. " +
        "Häuft sich das, ist ein Bann zu erwarten.",
    },
    {
      emoji: "👁️",
      title: "Kontrollrechte",
      text: "Jeder Admin darf unangemeldet einen Channel betreten oder einzelne User verschieben, um ein Gespräch zu kontrollieren.",
    },
    {
      emoji: "💣",
      title: "Hackerangriffe",
      text: "Jeder Angriff gegen diesen Server ist strafbar. Das betrifft vor allem Flooding mit diversen Programmen und DoS-Attacken.",
    },
    {
      emoji: "🎙️",
      title: "Gespräche aufnehmen",
      text:
        "Das Mitschneiden von Gesprächen ist auf dem gesamten Server nur in Absprache mit allen anwesenden Usern des Channels erlaubt. " +
        "Damit schützen wir eure Privatsphäre.",
    },
    {
      emoji: "📢",
      title: "Werbung",
      text:
        "Jegliche aktive Werbung für eigene Zwecke ist verboten, wenn sie nicht vorher mit dem Owner {@mops4ever} oder {@BroGamerYT} abgesprochen wurde.\n" +
        "Als Werbung gelten Audio- und Voice-Werbung, Links und Textnachrichten in Channels oder an einzelne User sowie hochgeladene Dateien mit Werbeinhalten.",
    },
    {
      emoji: "🔨",
      title: "Entfernen und Bannen",
      text:
        "Niemand wird grundlos gebannt oder entfernt! Alle Admins und Moderatoren dürfen User entfernen oder bannen, wenn sie es für notwendig halten. " +
        "Sollte das doch einmal unberechtigt passiert sein, kannst du über das Forum, das Ticket-System oder per E-Mail eine Anfrage stellen.",
    },
    {
      emoji: "🔒",
      title: "Datenschutz",
      text:
        "Private Daten wie Telefonnummern, Adressen oder Passwörter dürfen nicht öffentlich geteilt werden.\n" +
        "Ein Admin oder vom Team eingesetzter Channel-Admin wird dich **niemals** nach deinem Passwort o. Ä. fragen. Passiert das doch, melde es bitte sofort {@mops4ever} oder {@BroGamerYT}.",
    },
    {
      emoji: "💬",
      title: "Textchannels, Nachrichten und Avatare",
      text:
        "• Verboten sind Wörter, die den Anschein erwecken, du seist Teammitglied, sowie menschenfeindliche, rassistische, sexistische, pornografische, nationalsozialistische, urheberrechtlich geschützte oder diskriminierende Inhalte. Das gilt auch für Avatare, die Persönlichkeitsrechte anderer verletzen.\n" +
        "• Das Team darf Nachrichten in den Textchannels löschen.\n" +
        "• Nachrichten müssen zum Thema des jeweiligen Textchannels passen.",
    },
    {
      emoji: "🫶",
      title: "Privatsphäre respektieren",
      text:
        "Respektiert die Privatsphäre der anderen. Wenn jemand länger nicht online ist, hat das einen Grund - " +
        "ständiges Anpingen (@Benutzername) oder Drängeln zu Gesprächen ist zu unterlassen.",
    },
  ],

  consequences: "Das Team behält sich vor, die Regeln jederzeit und ohne Ankündigung zu ändern.",

  acceptText:
    "Mit einem Klick auf **„Regeln akzeptieren“** bestätigst du, dass du die Regeln gelesen hast und dich daran hältst.\n\n" +
    "Danach werden **alle Kanäle** für dich freigeschaltet und du kannst dir in {permissions} deine Benachrichtigungen aussuchen. 🎉",
};
