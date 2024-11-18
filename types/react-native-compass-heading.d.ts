declare module "react-native-compass-heading" {
  export interface CompassHeadingOptions {
    frequency?: number; // Definir a frequência de atualização em ms
  }

  export interface CompassHeadingListener {
    (degrees: number): void;
  }

  export function start(
    degree: number,
    options: CompassHeadingOptions,
    listener: CompassHeadingListener
  ): void;
  export function stop(): void;
}
