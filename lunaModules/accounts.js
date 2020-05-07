// in this object we define all functions which should be visible to other scripts
var sql;
var util;

module.exports = function (_sql, _util) {
    sql = _sql;
    util = _util;

    return {
        registerUser: registerUser,
        deleteUser: deleteUser,
        getUser: getUser,
        updateUserData: updateUserData,
        updateUserIcon: updateUserIcon
    };
};

/*function createUser(username, email, password) {
    let salt = util.generateRandomString(10);
    password = util.sha256(password + salt);

    sql.query("insert into users(username,email,password,salt) values (?,?,?,?)", [username, email, password, salt]);
}*/

function registerUser(newUser, newMail, newPass, newDiscord, newSkype, newBio) {
	let newSalt = util.createCharString(12);
	let hashPass = util.sha256(newPass + newSalt);
	
	/*console.log({user: newUser,
				mail: newMail,
				pass: newPass,
				discord: newDiscord,
				skype: newSkype,
				bio: newBio});*/
	
	if (checkUsername(newUser)) {
		return false;
	} else {
		sql.query("INSERT INTO Accounts (`DisplayName`, `Password`, `ContactEmail`, `Discord`, `Skype`, `Bio`, `PassSalt`) VALUES (?,?,?,?,?,?,?)", [newUser, hashPass, newMail, newDiscord, newSkype, newBio, newSalt]);
		return true;
	}
	
}

function checkUsername(username) {
	
	var sqlResults = sql.query("SELECT `DisplayName` FROM Accounts WHERE `DisplayName`=?", [username]);
	
	console.log(sqlResults);
}

function deleteUser(id) {
    sql.query("delete from users where id=?", [id]);
}

function getUser(id) {
    sql.query("select u.username, u.email,ifnull(ui.`name`, 'Default') as 'image' from users u "
            + "left join `KV-user-icon` kvui on u.id=kvui.idUser "
            + "left join userIcons ui on ui.id=kvui.idIcon "
            + "where u.id=?", [id],
            function (row) {
                return row;
            });
}
/*
 * Include the rows to be changed in the object (only those subject to be changed!)
 * data.email = "";
 * data.username = "";
 */
function updateUserData(id, data){
    let updateString = "";
    let updateStringValues = [];
    for(let row in data) {
        updateString += (updateString == "" ? row+"=?" : ","+row+"=?");
        updateStringValues.push(data[row]);
    }
    updateStringValues.push(id);
    
    console.log("update users set "+updateString+" where id=?");
    console.log(updateStringValues);
        
    sql.query("update users set "+updateString+" where id=?", updateStringValues);
}

function updateUserIcon(idUser, idIcon){
    sql.query("delete from `KV-user-icon` where idUser=?", [idUser], function(){
        sql.query("insert into `KV-user-icon`(idUser,idIcon) values (?,?)", [idUser, idIcon]);
    });
} //
