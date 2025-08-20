import jwt from 'jsonwebtoken'

export function encryptStringWithKey(text) {
    const password = btoa(text);
    // console.log(password, 'wwwwwwwwwwwwwwwwww');
    return password;
}

export const generateAccessToken = (payload) => {
    let token = jwt.sign(payload, "vape_db"
        // , {
        //     expiresIn: '30d', // 1d', '30m'
        // }
    );
    return token;
};
