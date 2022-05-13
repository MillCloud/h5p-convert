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

## License

This project is licensed under the GNU AFFERO GENERAL PUBLIC LICENSE v3 License

- see the [LICENSE](LICENSE) file for details
