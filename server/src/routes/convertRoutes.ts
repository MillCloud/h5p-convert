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
                    marginX: string;
                    marginY: string;
                    masteryScore: string;
                    maxWidth: string;
                    restrictWidthAndCenter: string;
                    showRights: string;
                }
            > & { files: any },
            res
        ) => {
            const showRights = req.body.showRights === 'true';
            const marginX = Number.parseInt(req.body.marginX, 10);
            const marginY = Number.parseInt(req.body.marginY, 10);
            const restrictWidthAndCenter =
                req.query.restrictWidthAndCenter === 'true';
            const maxWidth = Number.parseInt(req.body.maxWidth, 10);

            const fileBuffer = req.files.file.data;

            const scorm = await convertController.h5pToScorm(
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
                'Content-disposition': 'attachment;filename=scorm.zip',
                'Content-Length': scorm.length
            });
            res.end(scorm);
        }
    );

    return router;
}
