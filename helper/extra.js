

export function encryptStringWithKey(text) {
    const password = btoa(text);
    // console.log(password, 'wwwwwwwwwwwwwwwwww');
    return password;
}

