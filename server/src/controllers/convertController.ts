import fs from 'fs-extra';
import _path from 'path';
import i18next from 'i18next';
import * as H5P from '@lumieducation/h5p-server';
import Logger from '../helpers/Logger';
import User from '../h5pImplementations/User';
import scopackager from 'simple-scorm-packager';
import scormTemplate from './templates/scorm';
import { withDir } from 'tmp-promise';
import HtmlExporter from '@lumieducation/h5p-html-exporter';
import promisePipe from 'promisepipe';
// import { resolve } from 'upath';

const log = new Logger('controller:lumi-convert');

const t = i18next.getFixedT(null, 'lumi');

const cleanAndTrim = (text) => {
    const textClean = text.replace(/[^a-zA-Z\d\s]/g, '');
    return textClean.replace(/\s/g, '');
};

export default class ConvertController {
    constructor(private h5pEditor: H5P.H5PEditor) {}

    public async h5pToScorm(
        buffer: Buffer,
        translationFunction: H5P.ITranslationFunction,

        options: {
            marginX: number;
            marginY: number;
            masteryScore: number;
            maxWidth: number;
            restrictWidthAndCenter: boolean;
            showRights: boolean;
        }
    ): Promise<Buffer> {
        const user = new User();

        const { metadata, parameters } = await this.h5pEditor.uploadPackage(
            buffer,
            user
        );

        const htmlExporter = new HtmlExporter(
            this.h5pEditor.libraryStorage,
            this.h5pEditor.contentStorage,
            this.h5pEditor.config,
            `${__dirname}/../../../h5p/core`,
            `${__dirname}/../../../h5p/editor`,
            scormTemplate(
                options.marginX,
                options.marginY,
                options.restrictWidthAndCenter ? options.maxWidth : undefined
            ),
            translationFunction
        );

        const contentId = await this.h5pEditor.saveOrUpdateContent(
            undefined,
            parameters,
            metadata,
            this.getUbernameFromH5pJson(metadata),
            user
        );

        const path = './h5p-to-scorm';
        let scormBuffer = Buffer.alloc(0);
        await withDir(
            async ({ path: tmpDir }) => {
                await fs.copyFile(
                    `${__dirname}/../../../scorm-client/h5p-adaptor.js`,
                    _path.join(tmpDir, 'h5p-adaptor.js')
                );
                await fs.copyFile(
                    `${__dirname}/../../../scorm-client/SCORM_API_wrapper.js`,
                    _path.join(tmpDir, 'SCORM_API_wrapper.js')
                );

                const { html, contentFiles } =
                    await htmlExporter.createBundleWithExternalContentResources(
                        contentId,
                        user,
                        undefined,
                        {
                            showFrame: options.showRights,
                            showLicenseButton: options.showRights
                        }
                    );
                await fs.writeFile(_path.join(tmpDir, 'index.html'), html);
                for (const filename of contentFiles) {
                    const fn = _path.join(tmpDir, filename);
                    await fs.mkdirp(_path.dirname(fn));
                    const outputStream = fs.createWriteStream(fn, {
                        autoClose: true
                    });
                    await promisePipe(
                        await this.h5pEditor.contentStorage.getFileStream(
                            contentId,
                            filename,
                            user
                        ),
                        outputStream
                    );
                    outputStream.close();
                }

                const contentMetadata =
                    await this.h5pEditor.contentManager.getContentMetadata(
                        contentId,
                        user
                    );

                const temporaryFilename = await new Promise<string>(
                    (resolve, reject) => {
                        const opt = {
                            version: '1.2',
                            organization:
                                contentMetadata.authors &&
                                contentMetadata.authors[0]
                                    ? contentMetadata.authors[0].name
                                    : t(
                                          'editor.exportDialog.defaults.authorName'
                                      ),
                            title:
                                contentMetadata.title ||
                                t('editor.exportDialog.defaults.title'),
                            language: contentMetadata.defaultLanguage || 'en',
                            identifier: '00',
                            masteryScore: options.masteryScore,
                            startingPage: 'index.html',
                            source: tmpDir,
                            package: {
                                version: '1.0.0',
                                zip: true,
                                outputFolder: _path.dirname(path),
                                date: new Date().toISOString().slice(0, 10)
                            }
                        };
                        scopackager(opt, () => {
                            resolve(
                                `${cleanAndTrim(opt.title)}_v${
                                    opt.package.version
                                }_${opt.package.date}.zip`
                            );
                        });
                    }
                );

                // console.log('temporaryFilename: ', resolve(temporaryFilename)); // tmp: 项目根目录/Agamotto_v1.0.0_2022-05-10.zip
                scormBuffer = await fs.readFile(temporaryFilename);
                await fs.remove(temporaryFilename);
            },
            {
                keep: false,
                unsafeCleanup: true
            }
        );

        await this.h5pEditor.deleteContent(contentId, user);

        return scormBuffer;
    }

    private getUbernameFromH5pJson(h5pJson: H5P.IContentMetadata): string {
        const library = (h5pJson.preloadedDependencies || []).find(
            (dependency) => dependency.machineName === h5pJson.mainLibrary
        );
        if (!library) {
            return '';
        }
        return H5P.LibraryName.toUberName(library, { useWhitespace: true });
    }
}
