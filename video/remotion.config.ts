import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
// El video vive de capturas de pantalla con texto chico: una compresión alegre
// convierte el copy en puré. CRF 18 pesa más y se lee.
Config.setCrf(18);
Config.setOverwriteOutput(true);
