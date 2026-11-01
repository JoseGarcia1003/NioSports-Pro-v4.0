// balldontlie uses "LA Clippers"; The Odds API uses "Los Angeles Clippers".
// Matching on the team nickname ("Clippers", "Trail Blazers") covers both.
export function sameTeam(oddsName, nickname) {
  return typeof oddsName === 'string' && typeof nickname === 'string' && nickname.length > 2 && oddsName.toLowerCase().endsWith(nickname.toLowerCase());
}
