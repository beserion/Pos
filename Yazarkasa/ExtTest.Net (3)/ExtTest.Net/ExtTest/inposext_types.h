#ifndef INPOSEXT_TYPES
#define INPOSEXT_TYPES

#include <stdint.h>

#ifdef __GNUC__
#define __stdcall __attribute__((stdcall))
#endif

typedef void (__stdcall *EcrStateChangeCallback)(int32_t ecrState, int32_t saleState);
typedef void (__stdcall *ApplicationMessageCallback)(int32_t applicationId, const char *data, int32_t size);

typedef enum
{
    InposNoError = 0,
    InposNotInitializedError,
    InposConnectionError,
    InposNullArgumentError,
    InposInvalidArgumentError,
    InposMessageParsingError,
    InposInvalidEcrStateError,
    InposInvalidSaleStateError,
    InposInvalidOperationError,
    InposNoPrinterPaperError,
    InposGmp3PairingError,
    InposGmp3EncryptionError,
    InposGmp3PacketError,
    InposGmp3ApplicationHashError,
    InposExternalPrinterError,
    InposReportPrintingError,
    InposPayloadSizeError,
    InposTsmConnectionError,
    InposExtErrorEnd
} InposExtError;

typedef enum
{
    InposNoErrorDetail = 0,

    InposConnectionErrorBegin       = InposConnectionError << 8,
    InposNotConnectedToDevice       = InposConnectionErrorBegin,
    InposAddressInUseError,
    InposHostNotFoundError,
    InposRemoteHostClosedError,
    InposSocketAccessError,
    InposSocketTimeoutError,
    InposSocketResourceError,
    InposSocketConnectionRefusedError,
    InposOtherSocketError,
    InposInvalidHandleError,
    InposConnectionErrorEnd,

    InposNullArgumentErrorBegin     = InposNullArgumentError << 8,
    InposNullEcrSerialNo            = InposNullArgumentErrorBegin,
    InposNullIpAddress,
    InposNullEcrState,
    InposNullSaleState,
    InposNullSaleTotals,
    InposNullSaleReceipt,
    InposNullSaleItem,
    InposNullMultipleSaleItems,
    InposNullInvoiceData,
    InposNullAcquirerIds,
    InposNullAcquirerIdsSize,
    InposNullZNo,
    InposNullSeconds,
    InposNullPrinterTextEncoding,
    InposNullPrinterText,
    InposNullPrinterTextFormat,
    InposNullSaleLimit,
    InposNullCashierName,
    InposNullBlockedFlag,
    InposNullSaleType,
    InposNullHandle,
    InposNullAmounts,
    InposNullAmountsSize,
    InposNullVatData,
    InposNullExternalPrinterBuffer,
    InposNullBuffer,
    InposNullSize,
    InposNullCount,
    InposNullSlipNo,
    InposNullFirstInvoiceType,
    InposNullSecondInvoiceType,
    InposNullReceiptData,
    InposNullRequestId,
    InposNullZReportData,
    InposNullQueryMessage,
    InposNullArgumentErrorEnd,

    InposInvalidArgumentErrorBegin  = InposInvalidArgumentError << 8,
    InposInvalidEcrSerialNoLength   = InposInvalidArgumentErrorBegin,
    InposInvalidIpAddress,
    InposInvalidPort,
    InposInvalidCustomerId,
    InposInvalidCustomerTaxNo,
    InposInvalidItemUnitPrice,
    InposInvalidItemSection,
    InposInvalidDiscountRate,
    InposInvalidDiscountAmount,
    InposInvalidItemUnit,
    InposInvalidMultipleItemCount,
    InposInvalidInvoiceType,
    InposInvalidCustomerNoType,
    InposInvalidSlipCount,
    InposInvalidInvoiceNo,
    InposInvalidReceiptNo,
    InposInvalidZNo,
    InposInvalidPrinterTextEncoding,
    InposInvalidPaymentAmount,
    InposInvalidEmptyLineCount,
    InposInvalidBufferLength,
    InposInvalidSaleType,
    InposInvalidExternalPrinterBufferSize,
    InposInvalidDate,
    InposInvalidEruNo,
    InposInvalidApplicationId,
    InposInvalidPaymentType,
    InposInvalidSaleLimit,
    InposInvalidFirstInvoiceType,
    InposInvalidSecondInvoiceType,
    InposInvalidReceiptSize,
    InposInvalidRequestIdSize,
    InposInvalidQuerySize,
    InposInvalidArgumentErrorEnd,

    InposGmp3PairingErrorBegin = InposGmp3PairingError << 8,
    InposGmp3PairingConnectionError = InposGmp3PairingErrorBegin,
    InposGmp3PairingCertificateError,
    InposGmp3PairingChecksumError,
    InposGmp3PairingErrorEnd

} InposExtErrorDetail;

typedef enum
{
    InposEcrInitialization = 0,
    InposEcrIdle,
    InposEcrNotUsable,
    InposEcrError,
    InposEcrLogin,
    InposEcrSale,
    InposEcrSaleWithInvoice,
    InposEcrMainMenu,
    InposEcrReports,
    InposEcrZReportRequired,
    InposEcrPrintingMerchantSlip,
    InposEcrInsertedCardCheck,
    InposEcrPaymentApplicationActive,
    InposEcrSaleWithCardPaymentCanceled,
    InposEcrMealcardApplicationSelection
} InposEcrState;

typedef enum
{
    InposSaleIdle = 0,
    InposSaleWaitingForInput,
    InposSaleWaitingCancelLastItemResponse,
    InposSaleWaitingCancelSaleResponse,
    InposSaleWaitingForSection,
    InposSaleWaitingForCustomerId,
    InposSaleWaitingForTransactionCompleted,
    InposSaleLimitReachedWithLastItem,
    InposSaleLimitReachedWithAddedAmount,
    InposSaleUndefinedPluItem,
    InposSaleInvalidSectionOfPluItem,
    InposSaleInvalidVatRateOfPluItem,
    InposSaleUndefinedSection,
    InposSaleUndefinedVatRate,
    InposSaleInvalidAmount,
    InposSaleDataFinalized
} InposEcrSaleState;

typedef enum
{
    SaleWithReceiptType,
    SaleWithInvoiceType,
    SaleWithMealCardType,
    AdvancePaymentType,
    DelayedPaymentType,
    ReturnedItemsSlipType
} InposSaleType;

typedef enum
{
    CreditCardPayment = 0,
    CashPayment       = 1,
    MealCardPayment   = 2
} PaymentType;

typedef enum
{
    Quantity = 0,
    Gram,
    Kilogram,
    Tonne,
    Milliliter,
    Liter,
    Meter,
    Kilometer
} Unit;

typedef struct
{
    //! 12.50 -> 1250. Set to 0 for a discount or addition to receipt total.
    uint64_t unitPrice;

    //! 1.2 -> 1200, i.e. uint32(double(m) * 1000)
    uint32_t multiplier;

    //! As percentage, between -99 and +INT_MAX, must be negative for a discount, otherwise it is addition
    int32_t  discountRate;

    //! The positive amount will be always discounted from the total amount of the item. If \a discountRate is non-zero, discountAmount is ignored.
    uint64_t discountAmount;

    //! If name[0] == '\0' then section name is used
    char name[52 + 1];

    //! Between 1-8
    uint8_t section;

    Unit unit;
} InposEcrSaleItem;

#define MAX_SALE_ITEM_COUNT 10

typedef struct
{
    uint16_t count;
    InposEcrSaleItem items[MAX_SALE_ITEM_COUNT];
} InposEcrMultipleSaleItems;

typedef struct {
    uint32_t vatRates[8];   //!<  %8 -> 800
    uint64_t vatAmounts[8]; //!<  12.50 -> 1250
    uint64_t amounts[8];    //!<  12.50 -> 1250
} InposEcrVatData;

typedef struct
{
    uint64_t totalAmount;
    uint64_t totalVat;
    uint64_t amountToPay;
    uint64_t cashPaymentAmount;
    uint64_t creditCardPaymentAmount;
    uint32_t itemCount;
} InposEcrSaleTotals;

#define MAX_ACQUIRER_COUNT   8

typedef struct {
    uint64_t totalAmount;
    uint32_t totalCount;
    struct {
        uint32_t id;
        uint64_t amount;
    } Acquirers[MAX_ACQUIRER_COUNT];
} InposEcrPayment;

typedef struct
{
    uint32_t itemCount;
    uint64_t totalAmount;
    uint64_t totalVat;
    uint64_t amountToPay;
    uint64_t cashPaymentAmount;
    InposEcrPayment creditCardPayment;
    InposEcrPayment mealCardPayment;
} InposEcrSaleTotalsExt;

typedef struct
{
    uint32_t receiptNo;
    uint32_t zNo;
    uint32_t eruNo;
    uint32_t dateTime;
} InposSaleReceipt;

typedef enum
{
    //! TCKN
    Id = 0,

    //! VKN
    TaxNo,
} CustomerNoType;

typedef enum
{
    Invoice = 0,
    EInvoice,
    EArchiveInvoice
} InvoiceType;

typedef struct
{
    InvoiceType invoiceType;
    CustomerNoType noType;

    //! Must be of length 10 for noType == TaxNo and 11 for noType == Id.
    char customerNo[11 + 1];

    //! UTF-8 encoded, null terminated string.
    char invoiceNo[16 + 1];

    //! 1 or 2.
    uint32_t slipCount;

    /*! Must be set if invoiceType is EInvoice or EArchiveInvoice. Not used for invoiceType == Invoice.
     *  Set to a non-zero value if information slip(s) should be printed as delivery note(s).
     */
    uint32_t printDeliveryNote;
} InposInvoiceData;

#endif // INPOSEXT_TYPES

