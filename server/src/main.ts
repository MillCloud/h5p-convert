/**
 * This file contains the Electron app initialization and is the main entry
 * point into the whole app. It initializes all other components and parses
 * command line arguments and other events received from the OS.
 */

import * as Sentry from '@sentry/electron';
import electron from 'electron';
import log from 'electron-log';
import os from 'os';
import SocketIO from 'socket.io';
import createHttpServer from './boot/httpServer';
import serverConfigFactory from './config/defaultPaths';
import matomo from './boot/matomo';
import { machineId } from 'node-machine-id';
import fsExtra from 'fs-extra';

import SettingsCache from './config/SettingsCache';
import migrations from './boot/migrations';
import initI18n from './boot/i18n';
import createApp from './boot/expressApp';
import StateStorage from './state/electronState';
import FilePickers from './helpers/FilePickers';
import FileHandleManager from './state/FileHandleManager';
import FileController from './controllers/FileController';
import { initH5P } from './boot/h5p';

const tmpDir = process.env.TEMPDATA || 'lumi';

const serverPaths = serverConfigFactory(process.env.USERDATA || 'lumi', tmpDir);

const settingsCache = new SettingsCache(serverPaths.settingsFile);

const mainWindow: electron.BrowserWindow = null;
let port: number;
const isDevelopment = process.env.NODE_ENV === 'development';

const electronState = new StateStorage();
const fileHandleManager = new FileHandleManager();

let fileController: FileController;

/**
 * (Re-)Creates the main window.
 * @param websocketArg
 */
export function createMainWindow(websocketArg: SocketIO.Server): void {
    log.info('skip createMainWindow');
}

process.on('uncaughtException', (error) => {
    log.error(error);
});

// create main BrowserWindow when electron is ready
const start = async () => {
    settingsCache.init();

    // Performs migrations needed due to updates.
    await migrations(serverPaths);

    // Make sure required directories exist
    await fsExtra.mkdirp(serverPaths.contentStoragePath);
    await fsExtra.mkdirp(serverPaths.librariesPath);
    await fsExtra.mkdirp(serverPaths.temporaryStoragePath);

    // Initialize localization
    const translationFunction = await initI18n(settingsCache);

    const { h5pEditor, h5pPlayer } = await initH5P(
        serverPaths,
        translationFunction,
        settingsCache,
        {
            devMode: true,
            libraryDir: undefined
        }
    );

    // Create the express server logic
    const expressApp = await createApp(
        h5pEditor,
        h5pPlayer,
        serverPaths,
        () => mainWindow,
        settingsCache,
        translationFunction,
        electronState,
        new FilePickers(fileHandleManager),
        fileHandleManager
    );

    log.info('express app is ready');
    const server = await createHttpServer(expressApp, isDevelopment);
    log.info('server booted');

    // The port in production is random and is 3000 in dev.
    port = (server.address() as any).port;
    log.info(`port is ${port}`);

    fileController = new FileController(
        h5pEditor,
        () => mainWindow,
        electronState,
        new FilePickers(fileHandleManager),
        fileHandleManager
    );

    const argv = process.argv;
    if (argv.length >= 2) {
        // Check if there are H5Ps specified in the command line args and
        // load them (Windows only).
        argv.splice(0, 1);
        const openFilePaths = argv.filter((arg) => arg.endsWith('.h5p'));
        if (openFilePaths.length > 0) {
            log.debug(`Opening file(s): ${openFilePaths.join(' ')}`);
        }
    }

    try {
        if ((await settingsCache.getSettings()).usageStatistics) {
            const data = {
                url: '/Lumi',
                _id: await machineId(),
                uid: await machineId(),
                e_c: 'App',
                e_a: 'start',
                lang: 'en',
                ua: os.type()
            };
            matomo.track(data);
        }
    } catch (error: any) {
        Sentry.captureException(error);
    }
};

start()
    .then(() => {
        log.info('starting server');
    })
    .catch((error) => {
        log.error(error);
    });
