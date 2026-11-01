import { Rgba, fromHex } from './color';

/**
 * Rona64: paleta padrão do Ronasprite, com 64 cores em 8 rampas de 8 tons (do escuro ao claro).
 * Cada rampa puxa os escuros para o roxo e os claros para o amarelo, para o sombreamento
 * de pixel art ficar mais vivo do que só escurecer a mesma cor.
 */
export const RONA64_HEX: readonly string[] = [
  // cinzas
  '#0d0d0f', '#2b2931', '#494554', '#676176', '#857d98', '#a399ba', '#c1b5dc', '#ffffff',
  // vermelhos
  '#291218', '#471922', '#651924', '#82141c', '#a0181a', '#be3730', '#dc5e4d', '#fabcaf',
  // laranjas / pele
  '#291312', '#471d19', '#652619', '#822f14', '#a04418', '#be6830', '#dc904d', '#fad7af',
  // amarelos / marrons
  '#291a12', '#472b19', '#653e19', '#825314', '#a07118', '#be9830', '#dcc24d', '#faf2af',
  // verdes
  '#242912', '#3a4719', '#4b6519', '#548214', '#5ea018', '#6fbe30', '#83dc4d', '#c6faaf',
  // cianos
  '#122829', '#194744', '#19655b', '#14826b', '#18a07a', '#30be8b', '#4ddc9d', '#affad3',
  // azuis
  '#121a29', '#192b47', '#193d65', '#145082', '#186ca0', '#3092be', '#4dbadc', '#afedfa',
  // roxos
  '#231229', '#381947', '#481965', '#531482', '#5d18a0', '#7030be', '#854ddc', '#c8affa',
];

export const RONA64: readonly Rgba[] = RONA64_HEX.map(fromHex);
