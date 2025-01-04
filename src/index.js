import axios from 'axios'
import Koa from 'koa'
import Router from 'koa-router'
import constant from './constant.js'
import cmdConstant from './cmd_constant.js'
import fs from 'fs'

async function getBasicMachineInfo(host) {
    const quicklook = (await axios.get(`${host}/quicklook`)).data
    const mem = (await axios.get(`${host}/mem`)).data
    const memswap = (await axios.get(`${host}/memswap`)).data
    const fs = (await axios.get(`${host}/fs`)).data
    let diskRoot = '未能找到根目录'
    for (const item of fs) {
        if (item.mnt_point === '/') {
            diskRoot = `根目录大小: ${(item.size / 1024 / 1024 / 1024).toFixed(2)}GB`
            break
        }
    }
    return `系统信息: ${(await axios.get(`${host}/system`)).data.hr_name}`
        + '\n'
        + `处理器: ${quicklook.cpu_name} ${quicklook.cpu_phys_core}核${quicklook.cpu_log_core}线程`
        + '\n'
        + `内存: ${(mem.total / 1024 / 1024 / 1024).toFixed(2)}GB`
        + '\n'
        + `交换分区: ${(memswap.total / 1024 / 1024 / 1024).toFixed(2)}GB`
        + '\n'
        + `磁盘: ${diskRoot}`
}

async function getBasicMachineStatus(host) {
    const quicklook = (await axios.get(`${host}/quicklook`)).data
    const fs = (await axios.get(`${host}/fs`)).data
    const memswap = (await axios.get(`${host}/memswap`)).data
    let diskRoot = '未能找到根目录'
    for (const item of fs) {
        if (item.mnt_point === '/') {
            diskRoot = `根目录使用率: ${item.percent}%`
            break
        }
    }
    return `处理器使用率: ${quicklook.cpu}%`
        + '\n'
        + `内存使用率: ${quicklook.mem}%`
        + '\n'
        + `交换分区使用率: ${memswap.percent}%`
        + '\n'
        + `磁盘: ${diskRoot}`
        + '\n'
        + `已开机时间: ${(await axios.get(`${host}/uptime`)).data}`
}

async function getBasicMachineSensors(host) {
    const sensors = (await axios.get(`${host}/sensors`)).data
    let res = ''
    for (const item of sensors) {
        res = res + `${item[item.key]}: ${item.value}${item.unit}` + '\n'
    }
    if (res.length > 0) {
        return res.substring(0, res.length - 1)
    } else {
        return res
    }
}

async function processCommand(axiosControlPlane, raw, extend) {
    const cmds = raw.split(' ')
    if (cmds.length >= 1) {
        const method = cmds[0]
        if (method === 'help') {
            return await new Promise((resolve, reject) => {
                fs.readFile('src/help', 'utf8', (err, data) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(data)
                    }
                })
            })
        }
        const config = JSON.parse((await axiosControlPlane.post(constant.PLUGIN_CONFIG_URL, {
            name: extend[constant.PLUGIN_NAME],
            config_key: 'hosts'
        })).data.data.config_value)

        switch (method) {
            case 'getMachineList':
                let res = '机器列表:'
                for (const i in config) {
                    res = res + '\n' + `第${Number(i) + 1}台机器: ${config[i].name}`
                }
                return res
            case 'getInfo':
                if (cmds.length > 1) {
                    const machineName = cmds[1]
                    let machineInfo = null
                    for (const item of config) {
                        if (item.name === machineName) {
                            machineInfo = item
                        }
                    }
                    if (machineInfo === null) {
                        return cmdConstant.RESULT_NO_SUCH_MACHINE
                    }
                    const basicMachineInfo = await getBasicMachineInfo(machineInfo.host)
                    return`机器${machineInfo.name}信息如下:\n${basicMachineInfo}`
                } else {
                    let res = '所有机器信息:\n----------'
                    for (const item of config) {
                        res = res + `\n机器${item.name}信息如下:\n${await getBasicMachineInfo(item.host)}\n----------`
                    }
                    return res
                }
            case 'getStatus':
                if (cmds.length > 1) {
                    const machineName = cmds[1]
                    let machineInfo = null
                    for (const item of config) {
                        if (item.name === machineName) {
                            machineInfo = item
                        }
                    }
                    if (machineInfo === null) {
                        return cmdConstant.RESULT_NO_SUCH_MACHINE
                    }
                    const basicMachineInfo = await getBasicMachineStatus(machineInfo.host)
                    return `机器${machineInfo.name}状态如下:\n${basicMachineInfo}`
                } else {
                    let res = '所有机器状态:\n----------'
                    for (const item of config) {
                        res = res + `\n机器${item.name}状态如下:\n${await getBasicMachineStatus(item.host)}\n----------`
                    }
                    return res
                }
            case 'getSensors':
                if (cmds.length > 1) {
                    const machineName = cmds[1]
                    let machineInfo = null
                    for (const item of config) {
                        if (item.name === machineName) {
                            machineInfo = item
                        }
                    }
                    if (machineInfo === null) {
                        return cmdConstant.RESULT_NO_SUCH_MACHINE
                    }
                    const basicMachineInfo = await getBasicMachineSensors(machineInfo.host)
                    return `机器${machineInfo.name}传感器信息如下:\n${basicMachineInfo}`
                } else {
                    let res = '所有机器传感器信息:\n----------'
                    for (const item of config) {
                        res = res + `\n机器${item.name}传感器信息如下:\n${await getBasicMachineSensors(item.host)}\n----------`
                    }
                    return res
                }
            default:
                return cmdConstant.RESULT_NO_SUCH_CMD
        }
    } else {
        return cmdConstant.RESULT_PARAMS_ERROR
    }
}

async function sendRequest(axiosControlPlane, pluginName, target, data) {
    return await axiosControlPlane.post(constant.PLUGIN_URL, {
        name: pluginName,
        target: target,
        data: data
    })
}

function main() {
    const host = process.env.HOST
    const port = process.env.PORT
    const prefix = process.env.PREFIX || ''
    const username = process.env.USERNAME
    const token = process.env.TOKEN
    const pluginName = process.env.PLUGIN_NAME

    const axiosControlPlane = axios.create({
        baseURL: constant.CONTROL_PLANE_BASE_REQUEST_URL(host, port, prefix),
        headers: {
            token, username
        }
    })

    const app = new Koa()
    const router = new Router()
    router.post(constant.PLUGIN_URL, ctx => {
        let _token = ctx.request.headers.token
        ctx.req.on(constant.EVENT_DATA, data => {
            let params = JSON.parse(data)
            let name = params[constant.PARAMS_NAME]
            let target = params[constant.PARAMS_TARGET]
            let raw = params[constant.PARAMS_DATA]
            if (target !== pluginName) {
                return ctx.response.body = JSON.stringify({
                    code: constant.ERROR_CODE_NOT_THIS_PLUGIN,
                    message: constant.ERROR_MESSAGE_NOT_THS_PLUGIN
                })
            }
            if (_token !== token) {
                return ctx.response.body = JSON.stringify({
                    code: constant.ERROR_CODE_TOKEN_INVALID,
                    message: constant.ERROR_MESSAGE_TOKEN_INVALID
                })
            }
            const extend = {}
            extend[constant.PLUGIN_NAME] = pluginName
            processCommand(axiosControlPlane, raw, extend).then(data => {
                sendRequest(axiosControlPlane, pluginName, name, data).then(res => {
                    console.log(res)
                }).catch(err => {
                    console.log(err)
                })
            }).catch(err => {
                console.log(err)
                sendRequest(axiosControlPlane, pluginName, name, err.message).then(res => {
                    console.log(res)
                }).catch(err => {
                    console.log(err)
                })
            })
            ctx.response.body = JSON.stringify({
                code: constant.ERROR_CODE_SUCCESS,
                message: constant.ERROR_MESSAGE_SUCCESS
            })
        })
    })
    app.use(router.routes()).use(router.allowedMethods())
    app.listen(80)
}

main()
