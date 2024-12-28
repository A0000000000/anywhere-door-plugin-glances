const DEFAULT_HOST = 'default ip'
const DEFAULT_PORT = 'default port'
const DEFAULT_PREFIX = ''
const DEFAULT_USERNAME = 'default user'
const DEFAULT_TOKEN = 'default token'
const DEFAULT_PLUGIN_NAME = 'default plugin'

const PLUGIN_URL = '/plugin'

const EVENT_DATA = 'data'

const PARAMS_NAME = 'name'
const PARAMS_TARGET = 'target'
const PARAMS_DATA = 'data'

const ERROR_CODE_SUCCESS = 0
const ERROR_CODE_NOT_THIS_PLUGIN = -1
const ERROR_CODE_TOKEN_INVALID = -2
const ERROR_CODE_UNKNOWN = -3

const ERROR_MESSAGE_SUCCESS = 'success'
const ERROR_MESSAGE_NOT_THS_PLUGIN = 'not this plugin'
const ERROR_MESSAGE_TOKEN_INVALID = 'token not valid'

const REQUEST_URL = (host, port, prefix) =>  `http://${host}:${port}${prefix}/plugin`
const REQUEST_CONFIG_URL = (host, port, prefix) =>  `http://${host}:${port}${prefix}/plugin/config`

export default {
    DEFAULT_HOST,
    DEFAULT_PORT,
    DEFAULT_PREFIX,
    DEFAULT_USERNAME,
    DEFAULT_TOKEN,
    DEFAULT_PLUGIN_NAME,
    PLUGIN_URL,
    EVENT_DATA,
    PARAMS_NAME,
    PARAMS_TARGET,
    PARAMS_DATA,
    ERROR_CODE_SUCCESS,
    ERROR_CODE_NOT_THIS_PLUGIN,
    ERROR_CODE_TOKEN_INVALID,
    ERROR_CODE_UNKNOWN,
    ERROR_MESSAGE_SUCCESS,
    ERROR_MESSAGE_NOT_THS_PLUGIN,
    ERROR_MESSAGE_TOKEN_INVALID,
    REQUEST_URL,
    REQUEST_CONFIG_URL
}