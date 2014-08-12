if(typeof process === 'object' && process + '' === '[object process]'){
    // is node
    module.exports = public;
}
else{
    // not node
    Orgy = public;
}