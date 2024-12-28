import axios from 'axios'
import Koa from 'koa'
import Router from 'koa-router'
import constant from './constant.js'
import cmdConstant from './cmd_constant.js'

const host = process.env.HOST || constant.DEFAULT_HOST
const port = process.env.PORT ||  constant.DEFAULT_PORT
const prefix = process.env.PREFIX || constant.DEFAULT_PREFIX
const username = process.env.USERNAME || constant.DEFAULT_USERNAME
const token = process.env.TOKEN || constant.DEFAULT_TOKEN
const pluginName = process.env.PLUGIN_NAME || constant.DEFAULT_PLUGIN_NAME

async function processCommand(source, rawCmd) {
    const cmds = rawCmd.split(' ')
    if (cmds.length >= 1) {
        const method = cmds[0]
        if (method === 'help') {
            const help = `Glances 指令帮助\n1. getMachineList: 获取机器列表\n2. getInfo [name]: 获取名字叫name机器的信息, 不传name则获取所有机器信息\n3. getStatus [name]: 获取名字叫name机器的简略状态, 不传name则获取所有机器简略状态\n4. getSensors [name]: 获取名字叫name机器的传感器信息, 不传name则获取所有机器传感器信息`
            sendRequest(source, help)
            return
        }
        const config = JSON.parse((await axios.post(constant.REQUEST_CONFIG_URL(host, port, prefix), {
            name: pluginName,
            config_key: 'hosts'
        }, {
            headers: {
                token,
                username
            }
        })).data.data.config_value)
        switch (method) {
            case 'getMachineList':
                let res = '机器列表:'
                for (const i in config) {
                    res = res + '\n' + `第${Number(i) + 1}台机器: ${config[i].name}`
                }
                sendRequest(source, res)
                break
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
                        sendRequest(source, cmdConstant.RESULT_NO_SUCH_MACHINE)
                        return
                    }
                    const basicMachineInfo = await getBasicMachineInfo(machineInfo.host)
                    sendRequest(source, `机器${machineInfo.name}信息如下:\n${basicMachineInfo}`)
                } else {
                    let res = '所有机器信息:\n----------'
                    for (const item of config) {
                        res = res + `\n机器${item.name}信息如下:\n${await getBasicMachineInfo(item.host)}\n----------`
                    }
                    sendRequest(source, res)
                }
                break
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
                        sendRequest(source, cmdConstant.RESULT_NO_SUCH_MACHINE)
                        return
                    }
                    const basicMachineInfo = await getBasicMachineStatus(machineInfo.host)
                    sendRequest(source, `机器${machineInfo.name}状态如下:\n${basicMachineInfo}`)
                } else {
                    let res = '所有机器状态:\n----------'
                    for (const item of config) {
                        res = res + `\n机器${item.name}状态如下:\n${await getBasicMachineStatus(item.host)}\n----------`
                    }
                    sendRequest(source, res)
                }
                break
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
                        sendRequest(source, cmdConstant.RESULT_NO_SUCH_MACHINE)
                        return
                    }
                    const basicMachineInfo = await getBasicMachineSensors(machineInfo.host)
                    sendRequest(source, `机器${machineInfo.name}传感器信息如下:\n${basicMachineInfo}`)
                } else {
                    let res = '所有机器传感器信息:\n----------'
                    for (const item of config) {
                        res = res + `\n机器${item.name}传感器信息如下:\n${await getBasicMachineSensors(item.host)}\n----------`
                    }
                    sendRequest(source, res)
                }
                break
            default:
                sendRequest(source, cmdConstant.RESULT_NO_SUCH_CMD)
                return
        }
    } else {
        sendRequest(source, cmdConstant.RESULT_PARAMS_ERROR)
    }
}

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

function sendRequest(target, data) {
    axios.post(constant.REQUEST_URL(host, port, prefix), {
        name: pluginName,
        target: target,
        data: data
    }, {
        headers: {
            token,
            username
        }
    }).then(resp => {
        console.log(resp.data)
    }).catch(err => {
        console.log(err)
    })
}

function main() {
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
            processCommand(name, raw).then()
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
