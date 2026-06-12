import type { TeamCode } from "@/lib/scoring/types"

/**
 * Players to Watch — sourced from The Athletic's "200 stars of the 2026 World
 * Cup" piece. Five tiers, in descending order of weight: Legends, Superstars,
 * Key Players, Rising Stars, Unsung Heroes.
 *
 * Source (subscription):
 *   https://www.nytimes.com/athletic/interactive/fifa-world-cup-stars-of-soccer-2026/
 */

export type PlayerTier =
  | "Legends"
  | "Superstars"
  | "Key Players"
  | "Rising Stars"
  | "Unsung Heroes"

export const PLAYER_TIER_ORDER: readonly PlayerTier[] = [
  "Legends",
  "Superstars",
  "Key Players",
  "Rising Stars",
  "Unsung Heroes",
] as const

export interface PlayerToWatch {
  name: string
  team: TeamCode
  position: "GK" | "DF" | "MF" | "FW"
  tier: PlayerTier
}

export const PLAYERS_TO_WATCH: readonly PlayerToWatch[] = [
  // ALG
  { name: "Luca Zidane", team: "ALG", position: "GK", tier: "Key Players" },
  { name: "Mohammed Amoura", team: "ALG", position: "FW", tier: "Key Players" },
  { name: "Riyad Mahrez", team: "ALG", position: "FW", tier: "Key Players" },
  // ARG
  { name: "Lionel Messi", team: "ARG", position: "FW", tier: "Legends" },
  { name: "Cristian Romero", team: "ARG", position: "DF", tier: "Key Players" },
  { name: "Emiliano Martinez", team: "ARG", position: "GK", tier: "Key Players" },
  { name: "Lautaro Martinez", team: "ARG", position: "FW", tier: "Key Players" },
  { name: "Nico Paz", team: "ARG", position: "FW", tier: "Rising Stars" },
  { name: "Alexis Mac Allister", team: "ARG", position: "MF", tier: "Unsung Heroes" },
  // AUS
  { name: "Jackson Irvine", team: "AUS", position: "MF", tier: "Key Players" },
  { name: "Jordan Bos", team: "AUS", position: "DF", tier: "Rising Stars" },
  { name: "Mohamed Toure", team: "AUS", position: "FW", tier: "Rising Stars" },
  { name: "Nestory Irankunda", team: "AUS", position: "FW", tier: "Rising Stars" },
  // AUT
  { name: "David Alaba", team: "AUT", position: "DF", tier: "Legends" },
  { name: "Marko Arnautovic", team: "AUT", position: "FW", tier: "Key Players" },
  { name: "Romano Schmid", team: "AUT", position: "MF", tier: "Key Players" },
  // BEL
  { name: "Kevin De Bruyne", team: "BEL", position: "MF", tier: "Legends" },
  { name: "Thibaut Courtois", team: "BEL", position: "GK", tier: "Superstars" },
  { name: "Charles De Ketelaere", team: "BEL", position: "MF", tier: "Key Players" },
  { name: "Jeremy Doku", team: "BEL", position: "FW", tier: "Key Players" },
  { name: "Romelu Lukaku", team: "BEL", position: "FW", tier: "Key Players" },
  { name: "Matias Fernandez-Pardo", team: "BEL", position: "FW", tier: "Rising Stars" },
  // BIH
  { name: "Edin Dzeko", team: "BIH", position: "FW", tier: "Legends" },
  { name: "Esmir Bajraktarevic", team: "BIH", position: "FW", tier: "Rising Stars" },
  { name: "Kerim Alajbegovic", team: "BIH", position: "FW", tier: "Rising Stars" },
  { name: "Tarik Muharemovic", team: "BIH", position: "DF", tier: "Rising Stars" },
  // BRA
  { name: "Neymar", team: "BRA", position: "FW", tier: "Legends" },
  { name: "Vinicius Junior", team: "BRA", position: "FW", tier: "Superstars" },
  { name: "Alisson", team: "BRA", position: "GK", tier: "Key Players" },
  { name: "Marquinhos", team: "BRA", position: "DF", tier: "Key Players" },
  { name: "Raphinha", team: "BRA", position: "FW", tier: "Key Players" },
  { name: "Endrick", team: "BRA", position: "FW", tier: "Rising Stars" },
  { name: "Rayan", team: "BRA", position: "FW", tier: "Rising Stars" },
  { name: "Bruno Guimaraes", team: "BRA", position: "MF", tier: "Unsung Heroes" },
  // CAN
  { name: "Alphonso Davies", team: "CAN", position: "DF", tier: "Superstars" },
  { name: "Jonathan David", team: "CAN", position: "FW", tier: "Key Players" },
  { name: "Tajon Buchanan", team: "CAN", position: "MF", tier: "Key Players" },
  { name: "Niko Sigur", team: "CAN", position: "MF", tier: "Rising Stars" },
  { name: "Ismael Kone", team: "CAN", position: "MF", tier: "Unsung Heroes" },
  // CIV
  { name: "Amad Diallo", team: "CIV", position: "FW", tier: "Key Players" },
  { name: "Ibrahim Sangare", team: "CIV", position: "MF", tier: "Key Players" },
  { name: "Bazoumana Toure", team: "CIV", position: "FW", tier: "Rising Stars" },
  { name: "Ousmane Diomande", team: "CIV", position: "DF", tier: "Rising Stars" },
  { name: "Yan Diomande", team: "CIV", position: "FW", tier: "Rising Stars" },
  // COD
  { name: "Aaron Wan-Bissaka", team: "COD", position: "DF", tier: "Key Players" },
  { name: "Yoane Wissa", team: "COD", position: "FW", tier: "Key Players" },
  { name: "Noah Sadiki", team: "COD", position: "MF", tier: "Rising Stars" },
  // COL
  { name: "James Rodriguez", team: "COL", position: "FW", tier: "Legends" },
  { name: "Luis Diaz", team: "COL", position: "FW", tier: "Key Players" },
  { name: "Richard Rios", team: "COL", position: "MF", tier: "Key Players" },
  { name: "Luis Suarez", team: "COL", position: "FW", tier: "Unsung Heroes" },
  // CPV
  { name: "Ryan Mendes", team: "CPV", position: "MF", tier: "Key Players" },
  { name: "Sidny Lopes Cabral", team: "CPV", position: "DF", tier: "Key Players" },
  // CRO
  { name: "Luka Modric", team: "CRO", position: "MF", tier: "Legends" },
  { name: "Josko Gvardiol", team: "CRO", position: "DF", tier: "Key Players" },
  { name: "Luka Vuskovic", team: "CRO", position: "DF", tier: "Rising Stars" },
  { name: "Martin Baturina", team: "CRO", position: "MF", tier: "Rising Stars" },
  // CUW
  { name: "Juninho Bacuna", team: "CUW", position: "MF", tier: "Key Players" },
  { name: "Leandro Bacuna", team: "CUW", position: "MF", tier: "Key Players" },
  { name: "Sontje Hansen", team: "CUW", position: "MF", tier: "Key Players" },
  // CZE
  { name: "Patrik Schick", team: "CZE", position: "FW", tier: "Key Players" },
  { name: "Pavel Sulc", team: "CZE", position: "MF", tier: "Key Players" },
  // ECU
  { name: "Moises Caicedo", team: "ECU", position: "MF", tier: "Superstars" },
  { name: "Enner Valencia", team: "ECU", position: "FW", tier: "Key Players" },
  { name: "Willian Pacho", team: "ECU", position: "DF", tier: "Key Players" },
  { name: "Kendry Paez", team: "ECU", position: "FW", tier: "Rising Stars" },
  // EGY
  { name: "Mohamed Salah", team: "EGY", position: "FW", tier: "Legends" },
  { name: "Hossam Abdelmaguid", team: "EGY", position: "DF", tier: "Key Players" },
  { name: "Omar Marmoush", team: "EGY", position: "FW", tier: "Key Players" },
  // ENG
  { name: "Harry Kane", team: "ENG", position: "FW", tier: "Legends" },
  { name: "Bukayo Saka", team: "ENG", position: "FW", tier: "Superstars" },
  { name: "Declan Rice", team: "ENG", position: "MF", tier: "Superstars" },
  { name: "Jude Bellingham", team: "ENG", position: "MF", tier: "Superstars" },
  { name: "Jordan Pickford", team: "ENG", position: "GK", tier: "Key Players" },
  { name: "Elliot Anderson", team: "ENG", position: "MF", tier: "Rising Stars" },
  { name: "Nico O’Reilly", team: "ENG", position: "DF", tier: "Rising Stars" },
  // ESP
  { name: "Lamine Yamal", team: "ESP", position: "FW", tier: "Superstars" },
  { name: "Nico Williams", team: "ESP", position: "FW", tier: "Key Players" },
  { name: "Pedri", team: "ESP", position: "MF", tier: "Key Players" },
  { name: "Rodri", team: "ESP", position: "MF", tier: "Key Players" },
  { name: "Gavi", team: "ESP", position: "MF", tier: "Rising Stars" },
  { name: "Pau Cubarsi", team: "ESP", position: "DF", tier: "Rising Stars" },
  { name: "Victor Munoz", team: "ESP", position: "FW", tier: "Rising Stars" },
  { name: "Martin Zubimendi", team: "ESP", position: "MF", tier: "Unsung Heroes" },
  { name: "Mikel Oyarzabal", team: "ESP", position: "FW", tier: "Unsung Heroes" },
  // FRA
  { name: "Kylian Mbappe", team: "FRA", position: "FW", tier: "Superstars" },
  { name: "Michael Olise", team: "FRA", position: "FW", tier: "Superstars" },
  { name: "Ousmane Dembele", team: "FRA", position: "FW", tier: "Superstars" },
  { name: "William Saliba", team: "FRA", position: "DF", tier: "Key Players" },
  { name: "Desire Doue", team: "FRA", position: "FW", tier: "Rising Stars" },
  { name: "Rayan Cherki", team: "FRA", position: "MF", tier: "Rising Stars" },
  // GER
  { name: "Manuel Neuer", team: "GER", position: "GK", tier: "Legends" },
  { name: "Florian Wirtz", team: "GER", position: "MF", tier: "Superstars" },
  { name: "Jamal Musiala", team: "GER", position: "MF", tier: "Superstars" },
  { name: "Antonio Rudiger", team: "GER", position: "DF", tier: "Key Players" },
  { name: "Nico Schlotterbeck", team: "GER", position: "DF", tier: "Key Players" },
  { name: "Kai Havertz", team: "GER", position: "FW", tier: "Unsung Heroes" },
  // GHA
  { name: "Antoine Semenyo", team: "GHA", position: "FW", tier: "Key Players" },
  { name: "Kamaldeen Sulemana", team: "GHA", position: "FW", tier: "Key Players" },
  { name: "Caleb Yirenkyi", team: "GHA", position: "MF", tier: "Rising Stars" },
  // HAI
  { name: "Duckens Nazon", team: "HAI", position: "FW", tier: "Key Players" },
  { name: "Jean-Ricner Bellegarde", team: "HAI", position: "MF", tier: "Key Players" },
  { name: "Wilson Isidor", team: "HAI", position: "FW", tier: "Key Players" },
  // IRN
  { name: "Alireza Beiranvand", team: "IRN", position: "GK", tier: "Key Players" },
  { name: "Mehdi Taremi", team: "IRN", position: "FW", tier: "Key Players" },
  { name: "Saeid Ezatolahi", team: "IRN", position: "MF", tier: "Key Players" },
  // IRQ
  { name: "Ali Al-Hamadi", team: "IRQ", position: "FW", tier: "Key Players" },
  { name: "Aymen Hussein", team: "IRQ", position: "FW", tier: "Key Players" },
  // JOR
  { name: "Ihsan Haddad", team: "JOR", position: "DF", tier: "Key Players" },
  { name: "Musa Al-Taamari", team: "JOR", position: "FW", tier: "Key Players" },
  // JPN
  { name: "Ayase Ueda", team: "JPN", position: "FW", tier: "Key Players" },
  { name: "Ritsu Doan", team: "JPN", position: "FW", tier: "Key Players" },
  { name: "Takefusa Kubo", team: "JPN", position: "FW", tier: "Key Players" },
  // KOR
  { name: "Son Heung-min", team: "KOR", position: "FW", tier: "Legends" },
  { name: "Cho Gue-sung", team: "KOR", position: "FW", tier: "Key Players" },
  { name: "Kim Min-jae", team: "KOR", position: "DF", tier: "Key Players" },
  { name: "Lee Kang-in", team: "KOR", position: "MF", tier: "Key Players" },
  // KSA
  { name: "Salem Al-Dawsari", team: "KSA", position: "FW", tier: "Key Players" },
  { name: "Saud Abdulhamid", team: "KSA", position: "DF", tier: "Key Players" },
  // MAR
  { name: "Achraf Hakimi", team: "MAR", position: "DF", tier: "Superstars" },
  { name: "Ayoub El Kaabi", team: "MAR", position: "FW", tier: "Key Players" },
  { name: "Brahim Diaz", team: "MAR", position: "MF", tier: "Key Players" },
  { name: "Yassine Bounou", team: "MAR", position: "GK", tier: "Key Players" },
  { name: "Azzedine Ounahi", team: "MAR", position: "MF", tier: "Unsung Heroes" },
  // MEX
  { name: "Guillermo Ochoa", team: "MEX", position: "GK", tier: "Legends" },
  { name: "Alvaro Fidalgo", team: "MEX", position: "MF", tier: "Key Players" },
  { name: "Edson Alvarez", team: "MEX", position: "MF", tier: "Key Players" },
  { name: "Raul Jimenez", team: "MEX", position: "FW", tier: "Key Players" },
  { name: "Gilberto Mora", team: "MEX", position: "MF", tier: "Rising Stars" },
  { name: "Obed Vargas", team: "MEX", position: "MF", tier: "Rising Stars" },
  // NED
  { name: "Virgil van Dijk", team: "NED", position: "DF", tier: "Legends" },
  { name: "Cody Gakpo", team: "NED", position: "FW", tier: "Key Players" },
  { name: "Frenkie de Jong", team: "NED", position: "MF", tier: "Key Players" },
  { name: "Micky van de Ven", team: "NED", position: "DF", tier: "Key Players" },
  { name: "Jorrel Hato", team: "NED", position: "DF", tier: "Rising Stars" },
  { name: "Tijjani Reijnders", team: "NED", position: "MF", tier: "Unsung Heroes" },
  // NOR
  { name: "Erling Haaland", team: "NOR", position: "FW", tier: "Superstars" },
  { name: "Jens Petter Hauge", team: "NOR", position: "MF", tier: "Key Players" },
  { name: "Julian Ryerson", team: "NOR", position: "DF", tier: "Key Players" },
  { name: "Martin Odegaard", team: "NOR", position: "MF", tier: "Key Players" },
  { name: "Antonio Nusa", team: "NOR", position: "FW", tier: "Rising Stars" },
  // NZL
  { name: "Chris Wood", team: "NZL", position: "FW", tier: "Key Players" },
  { name: "Liberato Cacace", team: "NZL", position: "DF", tier: "Key Players" },
  { name: "Sarpreet Singh", team: "NZL", position: "MF", tier: "Key Players" },
  { name: "Finn Surman", team: "NZL", position: "DF", tier: "Rising Stars" },
  // PAN
  { name: "Adalberto Carrasquilla", team: "PAN", position: "MF", tier: "Key Players" },
  { name: "Amir Murillo", team: "PAN", position: "DF", tier: "Key Players" },
  { name: "Ismael Diaz", team: "PAN", position: "FW", tier: "Key Players" },
  // PAR
  { name: "Diego Gomez", team: "PAR", position: "MF", tier: "Key Players" },
  { name: "Miguel Almiron", team: "PAR", position: "MF", tier: "Key Players" },
  { name: "Omar Alderete", team: "PAR", position: "DF", tier: "Key Players" },
  { name: "Julio Enciso", team: "PAR", position: "MF", tier: "Rising Stars" },
  // POR
  { name: "Cristiano Ronaldo", team: "POR", position: "FW", tier: "Legends" },
  { name: "Bruno Fernandes", team: "POR", position: "MF", tier: "Superstars" },
  { name: "Nuno Mendes", team: "POR", position: "DF", tier: "Superstars" },
  { name: "Vitinha", team: "POR", position: "MF", tier: "Superstars" },
  { name: "Rafael Leao", team: "POR", position: "FW", tier: "Key Players" },
  // QAT
  { name: "Akram Afif", team: "QAT", position: "FW", tier: "Key Players" },
  { name: "Hassan Al-Haydos", team: "QAT", position: "FW", tier: "Key Players" },
  // RSA
  { name: "Oswin Appollis", team: "RSA", position: "FW", tier: "Key Players" },
  { name: "Ronwen Williams", team: "RSA", position: "GK", tier: "Key Players" },
  { name: "Mbekezeli Mbokazi", team: "RSA", position: "DF", tier: "Rising Stars" },
  // SCO
  { name: "Andrew Robertson", team: "SCO", position: "DF", tier: "Key Players" },
  { name: "John McGinn", team: "SCO", position: "MF", tier: "Key Players" },
  { name: "Scott McTominay", team: "SCO", position: "MF", tier: "Key Players" },
  { name: "Craig Gordon", team: "SCO", position: "GK", tier: "Unsung Heroes" },
  // SEN
  { name: "Sadio Mane", team: "SEN", position: "FW", tier: "Legends" },
  { name: "Iliman Ndiaye", team: "SEN", position: "FW", tier: "Key Players" },
  { name: "Lamine Camara", team: "SEN", position: "MF", tier: "Key Players" },
  { name: "Nicolas Jackson", team: "SEN", position: "FW", tier: "Key Players" },
  { name: "Ibrahim Mbaye", team: "SEN", position: "FW", tier: "Rising Stars" },
  { name: "Mamadou Sarr", team: "SEN", position: "DF", tier: "Rising Stars" },
  { name: "Pape Matar Sarr", team: "SEN", position: "MF", tier: "Unsung Heroes" },
  // SUI
  { name: "Breel Embolo", team: "SUI", position: "FW", tier: "Key Players" },
  { name: "Granit Xhaka", team: "SUI", position: "MF", tier: "Key Players" },
  { name: "Johan Manzambi", team: "SUI", position: "MF", tier: "Rising Stars" },
  { name: "Manuel Akanji", team: "SUI", position: "DF", tier: "Unsung Heroes" },
  // SWE
  { name: "Alexander Isak", team: "SWE", position: "FW", tier: "Key Players" },
  { name: "Viktor Gyokeres", team: "SWE", position: "FW", tier: "Key Players" },
  { name: "Lucas Bergvall", team: "SWE", position: "MF", tier: "Rising Stars" },
  // TUN
  { name: "Ellyes Skhiri", team: "TUN", position: "MF", tier: "Key Players" },
  { name: "Hannibal Mejbri", team: "TUN", position: "MF", tier: "Key Players" },
  { name: "Rani Khedira", team: "TUN", position: "MF", tier: "Key Players" },
  // TUR
  { name: "Hakan Calhanoglu", team: "TUR", position: "MF", tier: "Key Players" },
  { name: "Arda Guler", team: "TUR", position: "MF", tier: "Rising Stars" },
  { name: "Can Uzun", team: "TUR", position: "MF", tier: "Rising Stars" },
  { name: "Kenan Yildiz", team: "TUR", position: "FW", tier: "Rising Stars" },
  // URU
  { name: "Federico Valverde", team: "URU", position: "MF", tier: "Superstars" },
  { name: "Darwin Nunez", team: "URU", position: "FW", tier: "Key Players" },
  { name: "Ronald Araujo", team: "URU", position: "DF", tier: "Key Players" },
  { name: "Maxi Araujo", team: "URU", position: "MF", tier: "Unsung Heroes" },
  // USA
  { name: "Christian Pulisic", team: "USA", position: "FW", tier: "Superstars" },
  { name: "Antonee Robinson", team: "USA", position: "DF", tier: "Key Players" },
  { name: "Chris Richards", team: "USA", position: "DF", tier: "Key Players" },
  { name: "Folarin Balogun", team: "USA", position: "FW", tier: "Key Players" },
  { name: "Tyler Adams", team: "USA", position: "MF", tier: "Key Players" },
  { name: "Weston McKennie", team: "USA", position: "MF", tier: "Key Players" },
  // UZB
  { name: "Abdukodir Khusanov", team: "UZB", position: "DF", tier: "Key Players" },
  { name: "Eldor Shomurodov", team: "UZB", position: "FW", tier: "Key Players" },
  { name: "Abbosbek Fayzullaev", team: "UZB", position: "MF", tier: "Rising Stars" },
] as const

const TIER_RANK: Record<PlayerTier, number> = PLAYER_TIER_ORDER.reduce(
  (acc, t, i) => {
    acc[t] = i
    return acc
  },
  {} as Record<PlayerTier, number>
)

export function getPlayersForTeam(team: TeamCode): PlayerToWatch[] {
  return PLAYERS_TO_WATCH
    .filter((p) => p.team === team)
    .sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier])
}
