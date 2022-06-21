import BigDecimal from 'js-big-decimal';

export class Conversions {
    static to8bitHex = (value: number): string => { return ('00' + value.toString(16)).slice(-2); }
    static to32bitHex = (value: number): string => { return ('00000000' + value.toString(16)).slice(-8); }

    static bin2hex = (arr: Uint8Array): string => {
        let hex = "";
        for (let i = 0; i < arr.length; i++)
            hex += this.to8bitHex(arr[i]);
    
        return hex;
    }
    
    static fromAuBigDecimal = (value: number, decimals: number): BigDecimal => {
        if (isNaN(decimals)) decimals = 18;
        return new BigDecimal(value).divide(new BigDecimal(Math.pow(10, decimals)), 50);
    }

    static fromAu = (value: number, decimals: number): BigDecimal => {
        if (isNaN(decimals)) decimals = 18;
        let b = new BigDecimal(value).divide(new BigDecimal(Math.pow(10, decimals)), 50);
        return b;
    }
    
    static toAuHex = (value: BigDecimal, decimals: number): string => {
        if (isNaN(decimals)) decimals = 18;
        let b = value.multiply(new BigDecimal(Math.pow(10, decimals)));
        return (Number(b.floor().getValue())).toString(16).padStart(64, '0');
    }

    static toAuHexPrefixed = (value: BigDecimal, decimals: number): string => {
        if (isNaN(decimals)) decimals = 18;
        let b = value.multiply(new BigDecimal(Math.pow(10, decimals)));
        return '0x' + (Number(b.floor().getValue())).toString(16).padStart(64, '0');
    }

    static toShortAddress = (address: string | null) => {
        if (address === null) return '';
        
        let start = address.slice(0, 6);
        let end = address.slice(-4);
        return start + '...' + end;
    }

    static truncate = (num: BigDecimal | null, digits: number): string => {
        if (num == null) return '0.'.padEnd(digits + 2, '0');

        let val = num.getValue();
        let trunc = val.match(new RegExp("(\\d+\\.\\d{" + digits + "})"));
        if (trunc == null || trunc.length === 0)
            return val + '.'.padEnd(digits + 1, '0');
        
        return trunc[0];
    }
}
