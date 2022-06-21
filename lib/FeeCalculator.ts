import BigDecimal from 'js-big-decimal';

export class FeeCalculator {

    static calculateFeeForTotal = (amount: BigDecimal, feeBasisPoints: number): BigDecimal => {
        if (feeBasisPoints === 0)
            return new BigDecimal(0);

        let oneHundred: BigDecimal = new BigDecimal(100);
        let bp: BigDecimal = new BigDecimal(feeBasisPoints);

        let pFee: BigDecimal = bp.divide(oneHundred, 18);
        let fee: BigDecimal = amount.divide(oneHundred, 18);

        fee = fee.multiply(pFee);
        return fee;
    }
}