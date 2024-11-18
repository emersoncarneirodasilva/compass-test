declare module "magvar" {
  interface MagVar {
    get(latitude: number, longitude: number, height?: number): number;
  }

  const MagVar: MagVar;

  export default MagVar;
}
