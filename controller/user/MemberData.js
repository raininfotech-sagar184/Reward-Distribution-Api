const { sql_query } = require('../../utils/dbconnect')
const { check_user_login } = require('../../utils/Backend');
const { validate_string, encryption_key, enc, dec, validate_input_number_zero_or_one, validate_filter_numbers, validateFilterStrings } = require('../../utils/Common');
const MemberInfo = async (req, res) => {
  try {
    let user = await check_user_login(req) 
    if (!user.status || !user.data.userId) {
      return res.status(400).json({ message: "Unauthorized" });
    }
    let welcomeVideoLink = await sql_query(
      "SELECT metaValue  FROM tblslr_config  WHERE  metaKey = ?",
      ['welcomeVideoLink']
    );
    let faqData = await sql_query(
      "SELECT question, answer  FROM tblslr_faq", [], "Multi"
    );
    let countryData = user.data.countryId > 0 ? await sql_query("SELECT countryName FROM tblslr_country where countryId = ?", [user.data.countryId]) : ""

    let uniPlandata = await sql_query("SELECT referralCode FROM tblslr_uniPlanMatrix WHERE userId = ?",[user.data.userId]);

    //  Power plan data
    let pnodeRecord = await sql_query(
        `SELECT userId FROM tblslr_uniPlanMatrix WHERE parentId = ?`,
        [user.data.userId]
      );
    let PowerMatrixData = uniPlandata ? {
      id: enc(`${user.data.userId}`, encryption_key("userId")),
      name: user.data?.username ?? "-",
      isExpanded: pnodeRecord ? Object.keys(pnodeRecord).length > 0 : false,
    } : {}
    

    //  Matrix data 
    let TeamMatrixData = {}
    let TM_Data = await sql_query(
      `SELECT userId FROM tblslr_matrix WHERE userId = ?`,
      [user.data.userId]
    );
    if (TM_Data) {
      let tnodeRecord = await sql_query(
        `SELECT userId FROM tblslr_matrix WHERE parentId = ?`,
        [user.data.userId]
      );
      TeamMatrixData = {
        id: enc(`${TM_Data.userId}`, encryption_key("userId")),
        username: user?.data?.username ?? "-",
        isExpanded: tnodeRecord ? Object.keys(tnodeRecord).length > 0 : false,
      }
    } 
    let totalEarning = await sql_query(
      `SELECT SUM(usdAmount) as total_earning FROM tblslr_transaction WHERE userId = ? AND type IN (?, ?)`,
      [user.data.userId, 1, 2]
    )
    const memberData = {
      fname: user?.data?.name ?? "",
      user_name: user?.data?.username ?? "",
      email_address: user?.data?.email ?? "",
      country: countryData && countryData?.countryName ? countryData?.countryName  : "",
      ref_code: uniPlandata && uniPlandata?.referralCode ? uniPlandata?.referralCode :  "",
      welcomeVideoLink: welcomeVideoLink?.metaValue ?? "",
      show_wlc_video: user?.data?.showWelcomeVideo ?? "",
      activeUntill: user?.data?.membershipExpireOn ?? 0,
      teamMatrixData: TeamMatrixData,
      powerMatrixData: PowerMatrixData,
      totalEarning: totalEarning?.total_earning ?? 0
    }
    return res.status(200).json({ data: { ...memberData, faq: faqData } });
  } catch (e) {
    console.log("Error MemberData", e);
    return res.status(400).json({ message: "Something went wrong, please refresh the page." });
  }
}
const PowerMatrix = async (req, res) => {
  try {
    let body = req.query;
    let user = await check_user_login(req)
    if (!user.status || !user.data.userId) {
      return res.status(400).json({ message: "Unauthorized" });
    }
    const { parentId } = body

    try {
      validate_string(parentId, "valid user", 1)
    } catch (e) {
      return res.status(400).json({ message: e });
    }

    let matrixData = await sql_query(
      `SELECT userId FROM tblslr_uniPlanMatrix WHERE parentId = ?`,
      [dec(`${parentId}`, encryption_key("userId"))],
      "Multi"
    );
    const filterUserId = matrixData.map(item => item.userId)
    let userData = []
    let nodeRecord = []
    if (filterUserId.length > 0) {
      userData = await sql_query(
        `SELECT username,userId FROM tbluser WHERE userId IN (?)`,
        [filterUserId],
        "Multi"
      );
      nodeRecord = await sql_query(
        `SELECT parentId, userId FROM tblslr_uniPlanMatrix WHERE parentId IN (?)`,
        [filterUserId],
        "Multi"
      );
    }
    const allData =
      matrixData.map((j) => {
        const username = userData.find(item => item.userId == j.userId)?.username
        let nodeAvailableIn = nodeRecord.some(item => item.parentId == j.userId)
        return {
          id: enc(`${j.userId}`, encryption_key("userId")),
          name: username ?? "-",
          isExpanded: nodeAvailableIn,
        };
      })
    return res.status(200).json({ data: allData });
  } catch (e) {
    console.log("Error PowerMatrix", e);
    return res.status(400).json({ message: "Something went wrong, please refresh the page." });
  }
}

const TeamMatrix = async (req, res) => {
  try {
    let body = req.query;
    let user = await check_user_login(req)
    if (!user.status || !user.data.userId) {
      return res.status(400).json({ message: "Unauthorized" });
    }

    const { parentId } = body

    try {
      validate_string(parentId, "valid user", 1)
    } catch (e) {
      return res.status(400).json({ message: e });
    }

    let matrixData = await sql_query(
      `SELECT userId FROM tblslr_matrix WHERE parentId = ?`,
      [dec(`${parentId}`, encryption_key("userId"))],
      "Multi"
    );
    const filterUserId = matrixData.map(item => item.userId)
    let userData = []
    let nodeRecord = []
    if (filterUserId.length > 0) {
      userData = await sql_query(
        `SELECT username,userId FROM tbluser WHERE userId IN (?)`,
        [filterUserId],
        "Multi"
      );
      nodeRecord = await sql_query(
        `SELECT parentId, userId FROM tblslr_matrix WHERE parentId IN (?)`,
        [filterUserId],
        "Multi"
      );
    }
    const allData =
      matrixData.map((j) => {
        const username = userData.find(item => item.userId == j.userId)?.username
        let nodeAvailableIn = nodeRecord.some(item => item.parentId == j.userId)
        return {
          id: enc(`${j.userId}`, encryption_key("userId")),
          username: username ?? "-",
          isExpanded: nodeAvailableIn,
        };
      })
    return res.status(200).json({ data: allData });
  } catch (e) {
    console.log("Error TeamMatrix", e);
    return res.status(400).json({ message: "Something went wrong, please refresh the page." });
  }
}

const ChangeProfile = async (req, res) => {
  try {
    let body = req.body;
    const { show_wlc_video } = body
    let user = await check_user_login(req)
    if (!user.status || !user.data.userId) {
      return res.status(400).json({ message: "Unauthorized" });
    }

    try {
      validate_input_number_zero_or_one(`${show_wlc_video}`, `welcome video status`)
    } catch (e) {
      return res.status(400).json({ message: e });
    }

    await sql_query(`update tbluserDetailOfSolares set showWelcomeVideo = ? where userId =?`, [show_wlc_video, user.data.userId])
    return res.status(200).json({ message: `Welcome video setting has been ${show_wlc_video == 1 ? "on" : "off"} successfully`, videoShowStatus: show_wlc_video });

  } catch (e) {
    console.log("Error ChangeProfile", e);
    return res.status(400).json({ message: "Something went wrong, please refresh the page." });
  }
};


const transactionHistory = async (req, res) => {
  try {
    let user = await check_user_login(req)
    if (!user.status || !user.data.userId) {
      return res.status(400).json({ message: "Unauthorized" });
    }
    const userId = user.data.userId
    const { page, order, orderClm, startDate, endDate, coinType, type, search } = await req.query
    let query = '', filter = [], limit = process.env.LIMIT
    query += `SELECT  coinAmount, coinType, usdAmount,hash, type, details, createdOn FROM tblslr_transaction WHERE userId = ?`
    filter.push(userId)

    const fields = ["createdOn", "coinAmount", "usdAmount", "createdOn"]
    if (validate_filter_numbers([startDate, endDate])) {
      query += ` AND createdOn >= ? AND createdOn <= ?`
      filter.push(startDate)
      filter.push(endDate)
    }
    if (coinType != "" && validate_filter_numbers([coinType])) {
      query += " AND coinType = ?";
      filter.push(coinType)
    }
    if (validateFilterStrings([search])) {
      query += " AND (hash like ? )";
      filter.push('%' + search.trim() + '%');
    }
    if (type != "" && validate_filter_numbers([type])) {
      query += " AND type = ?";
      filter.push(type)
    }
    if (validate_filter_numbers([orderClm, order])) {
      query += " order by " + fields[orderClm] + " " + (order == 0 ? 'asc' : 'desc')
    }
    const countData = await sql_query(query, filter, "Count")
    let count = Math.ceil(countData / limit), allData = [], ascNum = page * limit, descNum = countData - page * limit;
    let transactionData = await sql_query(query, filter, "Multi")
    if (transactionData?.length > 0) {
      allData = transactionData?.map((j, k) => {
        return {
          num: order == 1 ? ++ascNum : descNum--,
          coinAmount: parseFloat(j.coinAmount),
          coinType: j.coinType,
          type: j.type,
          txhash: j.hash,
          usdAmount: parseFloat(j.usdAmount),
          details: j.details || "-",
          createdOn: j.createdOn,
        }
      })
    }
    res.status(200).send({ data: allData || [], total: count || 0 })
  } catch (e) {
    console.log("Error transactionHistory", e);
    return res.status(400).json({ message: "Something went wrong, please refresh the page." });
  }

}
module.exports = { MemberInfo, PowerMatrix, TeamMatrix, ChangeProfile, transactionHistory }

