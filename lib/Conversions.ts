import BigDecimal from 'js-big-decimal';

export class Conversions {
    static fromAu = (value: number, decimals: number): BigDecimal => {
        if (isNaN(decimals)) decimals = 18;
        return new BigDecimal(value).divide(new BigDecimal(Math.pow(10, decimals)), 50);
    }

    static toAu = (value: BigDecimal, decimals: number): string => {
        if (isNaN(decimals)) decimals = 18;
        let b = value.multiply(new BigDecimal(Math.pow(10, decimals)));
        return b.floor().getValue();
    }

    static toAuHex = (value: BigDecimal, decimals: number): string => {
        if (isNaN(decimals)) decimals = 18;
        let b = value.multiply(new BigDecimal(Math.pow(10, decimals)));
        return (Number(b.floor().getValue())).toString(16).padStart(64, '0');
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
