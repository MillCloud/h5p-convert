# h5p-convert

本项目用于将 h5p 转换为 scorm 课件

## 运行

```bash
# 安装 node 16.x

# clone 项目到本地

# 进入项目
$ cd h5p-convert

# 安装依赖
$ npm install

# 运行
$ npm run build

# 默认运行在 8080 端口
$ npm run start
```

## 部署

[pm2](https://pm2.keymetrics.io/)

```bash
pm2 start npm --name h5p-convert -- run start
```

## 接口

### 将 h5p 转为 scorm

`POST /api/v1/convert/h5p-to-scorm`

请求内容：

```json
{
    "filePath": "string, h5p 文件路径",
    "masteryScore": "number, 掌握分数"
}
```

成功返回值：zip 文件，header 中有文件信息

错误返回值：

```json
{
    "message": "string, 错误信息",
    "status": "number, 错误码",
    "error": {}
}
```

## 其他

拉取代码太慢：<https://ineo6.github.io/hosts/>

## License

This project is licensed under the GNU AFFERO GENERAL PUBLIC LICENSE v3 License

- see the [LICENSE](LICENSE) file for details
