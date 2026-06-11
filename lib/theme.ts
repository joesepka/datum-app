// ============================================================
//  DATUM THEME — the one-stop skin file.
//  Every page reads from `theme`. Change values here once,
//  and the whole app updates. Add more skins later by defining
//  another object and pointing `theme` at it.
// ============================================================

export const theme = {
  bg: '#FBF6EE',            // warm paper
  surface: '#FFFFFF',
  surfaceBorder: '#EEE6D8',
  ink: '#33291E',           // warm dark
  muted: '#9A8C77',         // warm grey
  line: '#EBE3D5',
  primary: '#D26A3D',       // warm coral accent
  primaryText: '#FCEFE8',
  tabBg: '#F1E9DB',
  radius: 13,               // row corner roundness
  font: "system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
  fontMono: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
  status: {
    lost:    { dot: '#D8463A', text: '#B23A2E' },
    atRisk:  { dot: '#E0A100', text: '#9A7A1E' },
    growing: { dot: '#4E9E55', text: '#3E6E2C' },
    new:     { dot: '#B3A48E', text: '#9A8C77' },
  },
}