const { sql_query } = require('../../utils/dbconnect')
const { get_timestemp, to_float } = require('../../utils/Common'); 
const { getVoucherCode } = require('../../utils/Backend'); 
const Web3 = require('web3')
const axios = require('axios');
const MEMBERSHIP_PLAN_EVENT_ABI = require('../../smabi/event/MEMBERSHIP_PLAN_EVENT_ABI');
const { sendMembershipVoucherMail } = require('../../utils/Backend');
const MembershipPlanEvent = async (req, res) => {
    const apiUrl = process.env.BSCSCAN_EVENT_URL;
    const apiKey = process.env.MEMBERSHIPPLAN_EVENT_KEY;
    console.log({apiUrl,apiKey})
    let web3 = new Web3(new Web3.providers.HttpProvider(process?.env?.RPCURL ? process.env.RPCURL : ''));
    const latestBlock = await web3.eth.getBlockNumber();
    let getLastBlockData = await sql_query(`select metaValue from tblslr_config where metaKey = ?`, ['membershipEventBlock'])
    let lastBlock = getLastBlockData && getLastBlockData?.metaValue > 0 ? parseFloat(getLastBlockData?.metaValue) : 0
    let fBlock = lastBlock > 0 ? lastBlock : latestBlock - 300
    let lBlock = lastBlock > 0 ? (lastBlock + 300 < latestBlock ? lastBlock + 300 : latestBlock) : latestBlock
    if (getLastBlockData) {
        await sql_query(`Update tblslr_config set metaValue = ? where metaKey = ?`, [lBlock, 'membershipEventBlock'])
    } else {
        await sql_query(`Insert into tblslr_config (metaKey,metaValue) values (?,?)`, ['membershipEventBlock', lBlock])
    }
    try {
        // Replace with your actual BscScan API key
        const params = {
            module: 'logs',
            action: 'getLogs',
            fromBlock: 44670725,
            toBlock: 44670725,
            address: process.env.MEMBERSHIP_PURCHASE_CONTRACT_ADDRESS,
            topic0: '0x4b891acc3a90f36d80804658de75a3b311469e303346f58f265d1e8d87f85770',
            apikey: apiKey
        };

        axios.get(apiUrl, { params })
            .then(async (response) => {
                console.log("result",response?.data?.result)
                if (response?.data?.result) {
                    for (let a of response?.data?.result) {
                        let hash = a?.transactionHash || ''
                        let haxData = a?.data || ''
                        if (hash && haxData) {
                            let checkPaymentExist = await sql_query(`select hash from tblslr_membershipPlanPaymentHistory where hash = ?`, [hash])
                            if (!checkPaymentExist) {
                                await getAddressFromHash(hash).then(async (userAddress) => {
                                    let abiInputs = MEMBERSHIP_PLAN_EVENT_ABI
                                    let eventData = web3.eth.abi.decodeParameters(abiInputs, haxData)
                                    console.log({ eventData,userAddress })
                                    let userData = userAddress ? await sql_query("SELECT walletAddress,userId FROM tbluserDetailOfSolares WHERE walletAddress =?", [userAddress.toLowerCase()]) : ''
                                    if (userData && eventData?.payId) {
                                        let txData = await sql_query(`select * from tblslr_membershipPlanPaymentHistory where slr_membershipPlanPaymentHistoryId = ? and payStatus != ?`, [eventData.payId,2])
                                        if (txData) {

                                        }
                                    }
                                })
                            } else {
                                console.log("Payment Exist")
                            }
                        }
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching logs:', error);
            });

    } catch (e) {
        console.error(e);
    }
    return res.status(200).json({ message: '' })
}
async function getAddressFromHash(hash) {
    let web3 = new Web3(new Web3.providers.HttpProvider(process?.env?.RPCURL ? process.env.RPCURL : ''))
    return await web3.eth
        .getTransactionReceipt(hash)
        .then(async function (data) {
            return data?.from || ''
        })
}
module.exports = {MembershipPlanEvent}  