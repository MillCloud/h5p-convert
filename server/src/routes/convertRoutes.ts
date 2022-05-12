import express from 'express';
import { H5PEditor, ITranslationFunction } from '@lumieducation/h5p-server';
import * as _path from 'path';

import Logger from '../helpers/Logger';
import ConvertController from '../controllers/convertController';

const log = new Logger('routes:convert');

export default function (
    h5pEditor: H5PEditor,
    translationFunction: ITranslationFunction
): express.Router {
    const router = express.Router();

    const convertController = new ConvertController(h5pEditor);

    router.post(
        `/h5p-to-scorm`,
        async (
            req: express.Request<
                any,
                any,
                {
                    filePath: string;
                    marginX: string;
                    marginY: string;
                    masteryScore: string;
                    maxWidth: string;
                    restrictWidthAndCenter: string;
                    showRights: string;
                }
            >,
            res
        ) => {
            const showRights = req.body.showRights === 'true';
            const marginX = Number.parseInt(req.body.marginX, 10);
            const marginY = Number.parseInt(req.body.marginY, 10);
            const restrictWidthAndCenter =
                req.query.restrictWidthAndCenter === 'true';
            const maxWidth = Number.parseInt(req.body.maxWidth, 10);

            const filePath = req.body.filePath;
            const masteryScore = req.body.masteryScore;

            if (typeof filePath !== 'string') {
                return res.status(400).json({
                    message: 'filePath is required',
                    status: 400,
                    error: {}
                });
            }
            if (!['number', 'string'].includes(typeof masteryScore)) {
                return res.status(400).json({
                    message: 'masteryScore is required',
                    status: 400,
                    error: {}
                });
            }

            const h5pFilePath = filePath.trim();
            const { buffer: fileBuffer, filenameWithoutExtension } =
                await convertController.readH5pFile(h5pFilePath);

            const scormFile = await convertController.h5pToScorm(
                fileBuffer,
                translationFunction,
                {
                    marginX,
                    marginY,
                    maxWidth,
                    showRights,
                    restrictWidthAndCenter,
                    masteryScore: Number.parseFloat(req.body.masteryScore)
                }
            );

            res.writeHead(200, {
                'Content-Type': 'application/octet-stream',
                'Content-disposition': `attachment;filename=${filenameWithoutExtension}.zip`,
                'Content-Length': scormFile.length
            });
            res.end(scormFile);
        }
    );

    return router;
}
