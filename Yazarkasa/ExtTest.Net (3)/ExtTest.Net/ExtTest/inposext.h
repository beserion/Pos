#ifndef INPOSEXT
#define INPOSEXT

#include "inposext_types.h"

#ifdef __cplusplus
extern "C"{
#endif

/*!
 * \brief Version of the library
 * \return Null-terminated ASCII string, e.g. "0.1.0".
 */
extern const char* inposext_version();

/*!
 * \brief Accepts a TCP connection on given end point and carries out other library initialization tasks.
 *
 * The TCP listener is closed once a connection is established. If this function is used withint the main/GUI thread of the application,
 * consider calling this function with small timeout values until a connection is established to prevent blocking the main thread for a long duration.
 *
 * If this function succeeds, \a ecrSerialNo will be the active device. If initialization fails, previous active device is restored.
 *
 * \note Since the functions opens a port to accept a connection, it may be necessary to allow the specified port in the firewall configuration.
 *
 * \warning All the other functions in the inposext library should be called in the same thread as this function.
 * To use this and other functions in the main/GUI thread, consider the advice above about small timeout values.
 *
 * \param applicationNo A unique number for the 3rd party application provided by Informatik. Test applications can use 1 as application number.
 * The application number must be the same as the one used for terminal-application PC pairing.
 * \param ecrSerialNo Null-terminated string of length 12 that contains ECR serial no.
 * \param address Null-terminated IP address string to accept a TCP connection, e.g. "0.0.0.0" to listen on all interfaces.
 * \param port Valid port to accept a TCP connection. Port must be greater than 0.
 * \param timeout Timeout value im milliseconds to accept a TCP connection.
 * \return A value from the InposExtError enumeration.
 */
extern int inposext_initialize(const uint32_t applicationNo, const char *ecrSerialNo, const char *address, const uint16_t port, const uint32_t timeout);

/*!
 * \brief Closes the connection with the active device.
 *
 * Active device is reset. Use inposext_set_active_device() to use another device, if available.
 *
 * If the closed device was the only active device, then ecr state notification callback is reset as well.
 *
 * \sa inposext_close_all(), inposext_set_active_device(), inposext_set_ecr_state_callback()
 */
extern void inposext_close();

/*!
 * \brief Closes all connections.
 *
 * \sa inposext_close()
 */
extern void inposext_close_all();

/*!
 * \brief Sets the active device to be used.
 *
 * If this function succeeds, all inposext functions except inposext_initialize() will use the connection of the device set with this function.
 *
 * \note In order to set a device, inposext_initialize() must have succeeded for that device.
 *
 * \param ecrSerialNo Serial no of the device that will be made active. \a ecrSerialNo must contain a null-terminated string of size 12.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_initialize()
 */
extern int inposext_set_active_device(const char *ecrSerialNo);

/*!
 * \brief Gets the active device.
 * \param ecrSerialNo Valid pointer to a char buffer of size 13 or more.
 * Active device's serial no will be copied to \a ecrSerialNo.
 * The copied string will be null-terminated.
 * \return A value from the InposExtError enumeration.
 */
extern int inposext_active_device(char *ecrSerialNo);

/*!
 * \brief Gets the active device's IP address.
 * \param address Valid pointer to a char buffer of size 40 or more.
 * Active device's IP will be copied to \a address.
 * The copied string will be null-terminated.
 * \return A value from the InposExtError enumeration.
 */
extern int inposext_active_device_ip(char *address);

/*!
 * \brief Logs into Cashier 1 account if ECR state is InposEcrLogin.
 * \param timeout Timeout value in milliseconds.
 * \return A value from the InposExtError enumeration.
 */
extern int inposext_login(const uint32_t timeout);

/*!
 * \brief Logs out of any cashier account if ECR state is InposEcrIdle or InposEcrMainMenu.
 * \param timeout Timeout value in milliseconds.
 * \return A value from the InposExtError enumeration.
 */
extern int inposext_logout(const uint32_t timeout);

/*!
 * \brief Sets the cashier name.
 *
 * Cashier name is printed on sale receipts and invoice slips.
 * Once  a name is set, it is used until a new name is set or
 * until logging out of ECR.
 *
 * \note Cashier name is cleared when closing the connection to ECR or logging in/out.
 * Cashier name should be set after logging in and before starting sale (with invoice).
 *
 * \param timeout Timeout value in milliseconds.
 * \param name Name of the cashier encoded as UTF-8. The string must be null-terminated.
 * Only the first 26 characters will be sent. The UTF-8 encoded text may be longer than 26 bytes.
 * \return A value from the InposExtError enumeration.
 */
extern int inposext_set_cashier_name(const uint32_t timeout, const char *name);

/*!
 * \brief Gets the current state of the electronic cash register (ECR).
 * \param timeout Timeout value in milliseconds.
 * \param ecrState Valid pointer to a InposEcrState variable.
 * The current state of the ECR will be set to \a ecrState.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_ecr_sale_state()
 */
extern int inposext_ecr_state(const uint32_t timeout, InposEcrState *ecrState);

/*!
 * \brief Gets the ecr and sale states.
 *
 * Unlike inposext_sale_state(), this function doesn't block while sale is ended.
 * Therefore it should be used to track the progress of a sale.
 *
 * It is safe to use this function even if the ECR is not in the InposEcrSale state.
 *
 * \note Consider receiving asynchronous state changes form the ECR
 * via inposext_set_ecr_state_callback().
 *
 * \param timeout Timeout value in milliseconds.
 * \param ecrState Valid pointer to an InposEcrState instance.
 * The current state of the ECR will be set to \a ecrState.
 * \param saleState Valid pointer to an InposEcrSaleState instance.
 * The current sale state of the ECR will be set to \a saleState.
 * If the ECR is not in the InposEcrSale state, then InposSaleIdle value is set.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_ecr_state(), inposext_sale_state(), inposext_set_ecr_state_callback()
 */
extern int inposext_ecr_sale_state(const uint32_t timeout, InposEcrState *ecrState, InposEcrSaleState *saleState);

/*!
 * \brief Sets a callback function for ECR state change notifications.
 *
 * ECR will send state updates to application PC whenever needed.
 *
 * \note A notification doesn't necessarily mean that a state change has occured.
 * It is the library user's responsibility to keep previous state and infer
 * a state change.
 *
 * The first parameter is a InposEcrState value. The second parameter is a InposEcrSaleState value.
 * If the ECR is not in InposEcrSale state, then InposSaleIdle value will be set to the sale state parameter.
 *
 * \note Since most of the state changes occur when functions of this library are called,
 * most of the state notifications will be received during a function call.
 * When a regular library function call returns, the notifications of state changes due to that
 * call will be already delivered.
 *
 * A library function may cause more than one and rapid ECR or sale state changes. Library users shouldn't
 * react to all state notifications but make sure that the ECR is in a proper state before using another
 * library function.
 *
 * \note The callback function to passed to this function as parameter must have the
 * \a __stdcall attribute.
 *
 * \warning The callback will be called form a thread different than all threads created by the application.
 * Library users should be able to handle notifications received during a library function call.
 * Make sure that the state information is properly transferred to relevant application thread.
 *
 * \param callbackFunction Function pointer of type void(*)(int32_t, int32_t).
 * Set a null pointer to disable notifications.
 */
extern void inposext_set_ecr_state_callback(EcrStateChangeCallback callbackFunction);

/*!
 * \brief Starts sale on ECR.
 *
 * The ECR must be in InposEcrIdle or InposEcrMainMenu state for this function to succceed.
 *
 * \note The inposext APIs' aim to provide the minimal required functionality to carry out a sale on ECR.
 * The application user should be guided by the application to bring the ECR to the expected state before using the PC application.
 *
 * \param timeout Timeout value in milliseconds.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_start_sale_with_invoice(), inposext_ecr_state()
 */
extern int inposext_start_sale(const uint32_t timeout);

/*!
 * \brief Starts sale with invoice on ECR.
 *
 * If this function is successfull, InposEcrState will be InposEcrSale while adding sale items and payments.
 * After total mount to pay is reached, InposEcrState will be InposEcrSaleWithInvoice.
 * inposext_end_sale_with_invoice() must be called when InposEcrState is InposEcrSaleWithInvoice.
 *
 * Before calling inposext_end_sale_with_invoice(), all sale related functions, including inposext_end_sale(), can be used.
 *
 * \param timeout Timeout value in milliseconds.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_start_sale(), inposext_end_sale_with_invoice()
 */
extern int inposext_start_sale_with_invoice(const uint32_t timeout);

/*!
 * \brief Adds a sale item or makes a discount/addition to receipt total.
 *
 * In order to make a discount or addition to receipt total, set item->unitPrice to zero.
 *
 * \param timeout Timeout value in milliseconds.
 * \param item Pointer to a valid InposEcrSaleItem instance that contains the item data.
 * \param totals Pointer to a valid InposEcrSaleTotals instance.
 * The new totals after adding the \a itemswill be set to this InposEcrSaleTotals instance if the item is added.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_add_multiple_sale_items(), inposext_delete_last_sale_item(), inposext_sale_limit(),
 */
extern int inposext_add_sale_item(const uint32_t timeout, const InposEcrSaleItem *item, InposEcrSaleTotals *totals);

/*!
 * \brief Adds up to MAX_SALE_ITEM_COUNT sale items.
 *
 * If adding an item makes the total amount to excedd the sale limit, that last item won't be added but already added items will be kept.
 * Consider using inposext_sale_limit() and preventing a possible sale limit error before adding the sale items.
 *
 * Unlike inposext_add_sale_item(), this function cannot be used to make a discount/addition to receipt total.
 * All sale items must have a valid \a unitPrice.
 *
 * \param timeout Timeout value in milliseconds.
 * \param items Pointer to a valid InposEcrMultipleSaleItems instance that contains sale items' data.
 * \a InposEcrMultipleSaleItems.count must be less than MAX_SALE_ITEM_COUNT and equal to the number of valid items in \a InposEcrMultipleSaleItems.items.
 * \a InposEcrMultipleSaleItems.count will be set to the number of items added and \a InposEcrMultipleSaleItems.item[i].unitPrice will be set
 * to the item amount calculated by ECR.
 * \param totals Pointer to a valid InposEcrSaleTotals instance.
 * The new totals after adding the \a items will be set to this InposEcrSaleTotals instance.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_add_sale_item(), inposext_sale_limit()
 */
extern int inposext_add_multiple_sale_items(const uint32_t timeout, InposEcrMultipleSaleItems *items, InposEcrSaleTotals *totals);

/*!
 * \brief Deletes the last sale item or discount/addition to recipt total.
 *
 * If there are no sale items, sale is ended and the ECR returns to the idle state (InposEcrIdle).
 * If there is a discount or addition to receipt total, that discount/adition is deleted.
 *
 * \param timeout Timeout value in milliseconds.
 * \param totals Pointer to a valid InposEcrSaleTotals instance. The new totals after deleting the last item will be set to this InposEcrSaleTotals instance.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_add_sale_item(), inposext_delete_sale_item()
 */
extern int inposext_delete_last_sale_item(const uint32_t timeout, InposEcrSaleTotals *totals);

/*!
 * \brief Deletes an item from the sale item list.
 *
 * In order to delete a sale item, the following conditions must be met:
 * \li index must be valid.
 * \li There must not be a partial payment, cash or credit card.
 * \li If there is a discount amount (not discount rate) for the receipt total amount,
 * the amount of the item to be deleted must be less than the current total amount.
 *
 * \param timeout Timeout value in milliseconds.
 * \param index Valid item index between 0 and N-1, where N is the number of sale items.
 * \param totals Pointer to a valid InposEcrSaleTotals instance. The new totals after deleting the last item will be set to this InposEcrSaleTotals instance.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_add_sale_item(), inposext_delete_last_sale_item()
 */
extern int inposext_delete_sale_item(const uint32_t timeout, const int32_t index, InposEcrSaleTotals *totals);

/*!
 * \brief Add SGK medical contribution amount.
 * \param timeout Timeout value in milliseconds.
 * \param amount Amount to add. Set to zero to delete the already added contribution. For 12,34 TL set to 1234
 * \param customerId 11 digit ID number of the customer. Must be set only if the amount is not zero.
 * \return A value from the InposExtError enumeration.
 */
extern int inposext_add_medical_contribution(const uint32_t timeout, const uint64_t amount, const uint64_t customerId);

/*!
 * \brief Gets the sale state.
 *
 * Since ending sale may take several seconds, this function may block until the sale is ended.
 *
 * \note Use inposext_ecr_sale_state() for non-blocking sale state tracking.
 *
 * \param timeout Timeout value in milliseconds.
 * \param saleState Valid pointer to an InposEcrSaleState instance.
 * The current sale state will be set to this InposEcrSaleState instance.
 * \param totals Pointer to a valid InposEcrSaleTotals instance.
 * The totals of the ongoing sale will be set to this InposEcrSaleTotals instance.
 * \param receipt Pointer to a valid InposSaleReceipt instance.
 * Z and receipt no for the ongoing sale will be set to this InposSaleReceipt instance.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_ecr_state(), inposext_ecr_sale_state(), inposext_end_sale()
 */
extern int inposext_sale_state(const uint32_t timeout, InposEcrSaleState *saleState, InposEcrSaleTotals *totals, InposSaleReceipt *receipt);

/*!
 * \brief Adds a payment to current sale.
 *
 * Amount to be paid can be split into multiple payments.
 * If the total amount paid is equal to or greater than the amount to be paid,
 * then the sale is automatically ended. If payment type is cash,
 * than the amount paid can be greater than the amount to be paid.
 * In this case the change is printed on the sale receipt.
 *
 * \param cashPayment Type of the payment. Set to 0 for credit card payment. Set to any other value for cash payment.
 * \param amount Payment amount. Can be smaller than the amount to be paid.
 * \return A value from the InposExtError enumeration.
 */
extern int inposext_add_payment(const PaymentType paymentType, const uint64_t amount);

/*!
 * \brief Sends end-sale request to the ECR.
 *
 * If the amount is split into multiple payments, then this function adds the given payment type with the remaining amount to be paid.
 *
 * This functions only sends a request to the ECR. It doesn't wait for the result of ending the sale.
 * Functions to query the state of the ECR and of an ongoing sale should be used to determine whether
 * a sale is ended successfully. Ending sale may take several seconds. Calling any state querying function
 * may block the application until after the sale is ended. Therefore consider checking the sale state
 * at least 4 seconds after calling inposext_end_sale in case of a cash payment. Although ending
 * sale with credit card payment takes longer than cash payment, the ECR can respond immediately
 * to state queries during most of that duration, since the ECR waits for the transaction result
 * from the EFT-POS application.
 *
 * \note inposext_ecr_state() and inposext_ecr_sale_state() doesn't block while ending sale.
 * Consider using these functions or setting a callback function to get state change notifications.
 *
 * Since a credit card payment requires customer and merchant slips to be printed in addition to a sale receipt
 * after the transaction is approved, the duration during which any query function blocks may be longer
 * than cash payment depending on when a query function is called. Therefore consider using small,
 * e.g. 1000 msecs, timeout values with all functions to prevent blocking the application for a noticeable time.
 *
 * \param paymentType Type of the payment.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_start_sale(), inposext_ecr_sale_state(), inposext_sale_state(), inposext_receipt_data()
 */
extern int inposext_end_sale(const PaymentType paymentType); // set cashPayment to 0 for credit card

/*!
 * \brief Sends end-sale-with-invoice request to the ECR.
 *
 * This function should be called after adding all sale items with inposext_add_sale_item() and payment with inposext_add_payment().
 * If total amount to pay is reached, InposEcrState will be InposEcrSaleWithInvoice, but before that it will be InposEcrSale.
 *
 * \param invoiceData Pointer to valid and filled-in InposInvoiceData instance.
 * \return A value from the InposExtError enumeration.
 */
extern int inposext_end_sale_with_invoice(const InposInvoiceData *invoiceData);

/*!
 * \brief Send end-sale-with-returned-items-slip request to ECR
 *
 * A returned items slip will be printed by the ECR.
 *
 * This function should be called after adding all returned items with inposext_add_sale_item().
 * There must be no payments. The \a paymentType parameter is used only for information purposes.
 * The payment data appears on the printed slip.
 *
 * It is recommended that this function is called after the payment method to the customer is known.
 *
 * \note If a chargeback to a customer's credit/deposit card is necessary,
 * inposext_open_eftpos_application() can be called to switch to the EFT-POS application.
 *
 * \param paymentType Type of the payment.
 * \note No EFT-POS is triggered.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_open_eftpos_application()
 */
extern int inposext_end_sale_with_returned_items_slip(const PaymentType paymentType);

/*!
 * \brief Gets sale data for a sale receipt.
 *
 * Data for previous sales can be queried with this function.
 *
 * \note The Z and receipt no combination must correspond to a sale receipt.
 * Since fiscal reports are also given a slip number (receipt number is the slip number of sale receipt),
 * A valid combination can cause an error if it doesn't correspond to a sale receipt.
 *
 * \note Sale data is kept on the terminal only for a couple of days. Therefore valid Z and receipt number combinations
 * may result in an InposInvalidOperationError if the sale data is not available anymore.
 *
 * \param timeout Timeout value in milliseconds.
 * \param receipt Pointer to a valid InposSaleReceipt instance.
 * \param totals Pointer to a valid InposEcrSaleTotals instance. The sale data for \a receipt will be set to this InposEcrSaleTotals instance.
 * \return A value from the InposExtError enumeration.
 */
extern int inposext_receipt_data(const uint32_t timeout, const InposSaleReceipt *receipt, InposEcrSaleTotals *totals);

/*!
 * \brief Gets extended sale data for a sale receipt.
 *
 * \note see inposext_receipt_data.
 *
 * \param timeout Timeout value in milliseconds.
 * \param receipt Pointer to a valid InposSaleReceipt instance.
 * \param totals Pointer to a valid InposEcrSaleTotalsExt instance. The sale data for \a receipt will be set to this InposEcrSaleTotalsExt instance.
 * \return A value from the InposExtError enumeration.
 */
extern int inposext_receipt_data_ext(const uint32_t timeout, const InposSaleReceipt *receipt, InposEcrSaleTotalsExt *totals);

/*!
 * \brief Cancels sale if sale state allows canceling.
 *
 * Sale state is checked before sending a cancel-sale request. It is not possible to cancel a sale after calling inposext_end_sale().
 *
 * \note If a credit card transaction fails, the sale state returns to a state that allows canceling the sale.
 *
 * \param timeout Timeout value in milliseconds.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_end_sale() for sale state query guidance
 */
extern int inposext_cancel_sale(const uint32_t timeout);

/*!
 * \brief Converts sale type.
 *
 * If the total amount of the sale items is above the sale limit,
 * the conversion to SaleWithReceiptType or SaleWithMealCardType will fail.
 *
 * \param timeout Timeout value in milliseconds.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_sale_type(), inposext_sale_limit()
 */
extern int inposext_convert_sale_type(const uint32_t timeout, InposSaleType to);

/*!
 * \brief Sets sale type.
 *
 * If the total amount of the sale items is above the sale limit,
 * setting to SaleWithReceiptType or SaleWithMealCardType will fail.
 *
 * \param timeout Timeout value in milliseconds.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_sale_type(), inposext_sale_limit()
 */
extern int inposext_set_sale_type(const uint32_t timeout, InposSaleType to);

/*!
 * \brief Gets the sale type.
 * \param timeout Timeout value in milliseconds.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_convert_sale_type()
 */
extern int inposext_sale_type(const uint32_t timeout, InposSaleType *type);

/*!
 * \brief Gets the active acquirers on device.
 *
 * \param timeout Timeout value in milliseconds.
 * \param ids Valid pointer to an uint array for active acquirer IDs. It is recommended that the array's size is at least 8.
 * \param size Valid pointer to an int. It must contain the size of \a ids.
 * If this function succeeds, the number of acquirers in \a ids will be written to \a size.
 * \note If the capacity of \a ids is not large enough, InposInvalidArgumentError will be returned and *size will be set to -1.
 *
 * \return A value from the InposExtError enumeration.
 * \sa inposext_acquirers_of_sale(), inposext_transaction_amounts_of_sale()
 */
extern int inposext_active_acquirers(const uint32_t timeout, int32_t *ids, int32_t *size);

/*!
 * \brief Gets the active collection application count.
 *
 * \param timeout Timeout value in milliseconds.
 * \param count Valid pointer to an int. It will be updated with the count of active app count.
 *
 * \return A value from the InposExtError enumeration.
 */
extern int inposext_active_collection_applications(const uint32_t timeout, int32_t *count);

/*!
 * \brief Gets the acquirers used in the last sale or sale with invoice.
 *
 * The list of acquirers used during a sale or sale with invoice is kept
 * until the next sale or sale with invoice starts.
 * During a transaction, this function returns the acquirer used in the ongoing transaction as well.
 * If the transaction fails, acquirer is removed from the list.
 *
 * Use inposext_transaction_amounts_of_sale() to get the transaction amount for each acquirer
 * returned by this function.
 *
 * \param timeout Timeout value in milliseconds.
 * \param ids Valid pointer to an uint array for used acquirer IDs.
 * It is recommended that the array's size is at least 8.
 * \param size Valid pointer to an int. It must contain the size of \a ids.
 * If this function succeeds, the number of acquirers in \a ids will be written to \a size.
 * \note If the capacity of \a ids is not large enough,
 * InposInvalidArgumentError will be returned and *size will be set to -1.
 *
 * \return A value from the InposExtError enumeration.
 * \sa inposext_transaction_amounts_of_sale(), inposext_active_acquirers()
 */
extern int inposext_acquirers_of_sale(const uint32_t timeout, int32_t *ids, int32_t *size);

/*!
 * \brief Gets the transaction amounts in the last sale or sale with invoice.
 *
 * This function returns the amounts of the credit card or meal card transactions.
 * It doesn't contain cash payments. InposEcrSaleTotals structure contains
 * amounts for each payment type. This function details the \a creditCardPaymentAmount
 * data member of InposEcrSaleTotals. Use inposext_sale_state() or inposext_receipt_data()
 * funtions to get amounts of a sale.
 *
 * The list of amounts is kept until the next sale or sale with invoice starts.
 * During a transaction, this function returns the amount of the ongoing transaction as well.
 * If the transaction fails, amount is removed from the list.
 *
 * The number amounts is equal to the number of acquirers returned from inposext_acquirers_of_sale(),
 * and an amount in the returned list corresponds to the acquirer a the same index of the list returned
 * by inposext_acquirers_of_sale();
 *
 * \param timeout Timeout value in milliseconds.
 * \param amounts Valid pointer to an uint64 array for transaction amounts.
 * It is recommended that the array's size is at least 8.
 * \param size Valid pointer to an int. It must contain the size of \a amounts.
 * If this function succeeds, the number of amounts in \a ids will be written to \a size.
 * \note If the capacity of \a amounts is not large enough,
 * InposInvalidArgumentError will be returned and *size will be set to -1.
 *
 * \return A value from the InposExtError enumeration.
 * \sa inposext_acquirers_of_sale(), inposext_sale_state(), inposext_receipt_data()
 */
extern int inposext_transaction_amounts_of_sale(const uint32_t timeout, uint64_t *amounts, int32_t *size);

/*!
 * \brief Gets VAT data of the ongoing or last sale.
 *
 * VAT data of sale is kept until the next sale or sale with invoice.
 *
 * \param timeout Timeout value in milliseconds.
 * \param vatData Valid pointer to a InposEcrVatData instance.
 * \return A value from the InposExtError enumeration.
 */
extern int inposext_vat_data_of_sale(const uint32_t timeout, InposEcrVatData *vatData);

/*!
 * \brief Opens EFT-POS application on device
 *
 * ECR state must be InposEcrIdle or InposEcrMainMenu.
 * Also there must be at least one activated EFT-POS application.
 *
 * \note If a meal card application is opened,
 * device input keys can be used even if the keys are blocked by inposext_block_ecr_keys().
 *
 * \param timeout Timeout value in milliseconds.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_active_acquirers(), inposext_open_mealcard_application()
 */
extern int inposext_open_eftpos_application(const uint32_t timeout);

/*!
 * \brief Opens meal card application on device
 *
 * ECR state must be InposEcrIdle or InposEcrMainMenu.
 * Also there must be at least one activated meal card application.
 *
 * \note If a meal card application is opened,
 * device input keys can be used even if the keys are blocked by inposext_block_ecr_keys().
 *
 * \param timeout Timeout value in milliseconds.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_active_acquirers(), inposext_open_eftpos_application()
 */
extern int inposext_open_mealcard_application(const uint32_t timeout);

extern int inposext_open_collection_application(const uint32_t timeout);

/*!
 * \brief Gets section name and VAT rate for a section.
 *
 * Section name will be set to the name member and VAT rate to the multiplier member of the InposEcrSaleItem instance.
 * For a VAT rate of 8%, multiplier will be set to 800, for 18% to 1800.
 *
 * For an empty section, the section name will be an empty string and the VAT rate will be 0.
 *
 * \param timeout Timeout value in milliseconds.
 * \param item Pointer to a valid InposEcrSaleItem instance. section member must be set to a valid section number.
 * \return A value from the InposExtError enumeration.
 */
extern int inposext_section_data(const uint32_t timeout, InposEcrSaleItem *item);

/*!
 * \brief Checks whether printer is out of paper.
 * \param timeout Timeout value in milliseconds.
 * \return A value from the InposExtError enumeration.
 */
extern int inposext_check_printer_paper(const uint32_t timeout);

/*!
 * \brief Gets the serial no of the ECR.
 * \param no Valid pointer to a char array of size 13 or more. Serial no will be written into \a no. \a no will contain a null-terminated string.
 * \return A value from the InposExtError enumeration.
 */
extern int inposext_ecr_serialno(char *no);

/*!
 * \brief Prints X report.
 *
 * This function doesn't block until X report is printed.
 *
 * \return A value from the InposExtError enumeration.
 * \sa inposext_ecr_state(), inposext_check_printer_paper()
 */
extern int inposext_x_report();

/*!
 * \brief Prints Z report.
 *
 * This function doesn't block until Z report is printed.
 * Use inposext_ecr_state() and inposext_current_z() to find out whether the Z report is printed successfully.
 *
 * \return A value from the InposExtError enumeration.
 * \sa inposext_ecr_state(), inposext_check_printer_paper(), inposext_current_z()
 */
extern int inposext_z_report();

/*!
 * \brief Gets content of a X report as string.
 *
 * Report content is UTF-8 encoded plain text.
 * Formatting may be different than the printed report.
 *
 * If zNo is the current Z no, then the slipNo will be set to 0 and date and time
 * will be those of the last sale or report. If zNo is less than the current Z no,
 * then the content will be the same as the Z report for the same Z no
 * except for the report title.
 *
 * This functions does not let the ECR print an X report.
 * Use inposext_x_report() for printing the report.
 *
 * \note It is recommended that this function is used with the current Z no.
 *
 * \param timeout Timeout value in milliseconds.
 * \param zNo The Z number for which X report data will be retrieved.
 * \param buffer Non-null pointer of a byte array. Recommended buffer size 4KB or 8KB
 * depending on the printer used.
 * Report data will be copied into the buffer as a null-terminated string.
 * \param size Pointer to an int. \a size must be the capacity of the buffer.
 * It will be updated with the size of the report data excluding the terminating null character.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_z_data(), inposext_x_report()
 */
extern int inposext_x_data(const uint32_t timeout, const uint16_t zNo, char *buffer, int *size);

/*!
 * \brief Gets content of a Z report as string.
 *
 * Report content is UTF-8 encoded plain text.
 * Formatting may be different than the printed report.
 *
 * If zNo is the current Z no, then the slipNo will be set to 0 and date and time
 * will be those of the last sale or report. The content will be the same as a X
 * report for the current Z no except for the report title. If zNo is less than the current Z no,
 * then the content will be the same as the Z report for that Z no.
 *
 * This functions does not let the ECR print a Z report.
 * Use inposext_z_report() for printing the report.
 *
 * \note It is recommended that this function is used for previous Z report data.
 * ECR doesn't keep Z report data older than 10 days.
 *
 * \param timeout Timeout value in milliseconds.
 * \param zNo The Z number for which Z report data will be retrieved.
 * \param buffer Non-null pointer of a byte array. Recommended buffer size 4KB.
 * Report data will be copied into the buffer as a null-terminated string.
 * \param size Pointer to an int. \a size must be the capacity of the buffer.
 * It will be updated with the size of the report data excluding the terminating null character.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_x_data(), inposext_z_report();
 */
extern int inposext_z_data(const uint32_t timeout, const uint16_t zNo, char *buffer, int *size);

/*!
 * \brief Prints and gets content of a Fiscal Memory report between 2 Z nos.
 *
 * Report content is UTF-8 encoded plain text.
 * Formatting may be different than the printed report.
 *
 * \note Getting data from the fiscal memory of the ECR and printing the report may take
 * tens of seconds depending on the number of Z report summaries that need
 * to be fetched. A large timeout value should be used.
 *
 * \param timeout Timeout value in milliseconds.
 * \param zNo_1 Z no if the first report.
 * \param zNo_2 Z no of the last report. Must be equal to or greater than zNo_1.
 * \param buffer Non-null pointer of a byte array.
 * Recommended buffer size 10KB.
 * Report data will be copied into the buffer as a null-terminated string.
 * \param size Pointer to an int. \a size must be the capacity of the buffer.
 * It will be updated with the size of the report data excluding the terminating null character.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_fm_data_date()
 */
extern int inposext_fm_data_z_no(const uint32_t timeout, const uint16_t zNo_1, const uint16_t zNo_2, char *buffer, int *size);

/*!
 * \brief Prints and gets content of a Fiscal Memory report between 2 dates.
 *
 * Report content is UTF-8 encoded plain text.
 * Formatting may be different than the printed report.
 *
 * \note Getting data from the fiscal memory of the ECR and printing the report may take
 * tens of seconds depending on the number of Z report summaries that need
 * to be fetched. A large timeout value should be used.
 *
 * \param timeout Timeout value in milliseconds.
 * \param startDate Date of the first Z report. Must be of the form YYYYMMDD.
 * \param endDate Date of the last Z report. Must be of the form YYYYMMDD.
 * Must be equal to or later than startDate.
 * \param buffer Non-null pointer of a byte array.
 * Recommended buffer size is 10KB.
 * Report data will be copied into the buffer as a null-terminated string.
 * \param size Pointer to an int. \a size must be the capacity of the buffer.
 * It will be updated with the size of the report data excluding the terminating null character.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_fm_data_z_no()
 */
extern int inposext_fm_data_date(const uint32_t timeout, const uint32_t startDate, const uint32_t endDate, char *buffer, int *size);

extern int inposext_print_eru_copy(const uint32_t timeout, const uint16_t eruNo, const uint16_t zNo, const uint16_t slipNo);

/*!
 * \brief Gets the current Z no.
 * \param timeout Timeout value in milliseconds.
 * \param no Valid pointer to a uint32_t instance.
 * \return A value from the InposExtError enumeration.
 */
extern int inposext_current_z(const uint32_t timeout, uint32_t *no);

/*!
 * \brief Gets the current slip no.
 *
 * Current slip no is the last sip no used in receipt,
 * information or report slip.
 *
 * \note If this function is called after printing a Z report,
 * returned slip no will be 0.
 *
 * \param timeout Timeout value in milliseconds.
 * \param no Valid pointer to a uint32_t instance.
 * \return A value from the InposExtError enumeration.
 */
extern int inposext_current_slip_no(const uint32_t timeout, uint32_t *no);

/*!
 * \brief Gets the last Z report's datetime as seconds passed since Unix epoch, i.e. 01.01.1970 00:00:00 UTC.
 * \param timeout Timeout value in milliseconds.
 * \param secsSinceEpoch Last Z report's datetime as seconds passsed since Unix epoch.
 * If last Z report's datetime is not available, it will be set to 0.
 * This function will return InposNoError even if \a secsSinceEpoch is 0.
 * \return A value from the InposExtError enumeration.
 */
extern int inposext_last_z_datetime(const uint32_t timeout, int32_t *secsSinceEpoch);

/*!
 * \brief Gets ECR's datetime as seconds passed since Unix epoch, i.e. 01.01.1970 00:00:00 UTC.
 * \param timeout Timeout value in milliseconds.
 * \param secsSinceEpoch ECR's datetime as seconds passsed since Unix epoch.
 * \return A value from the InposExtError enumeration.
 */
extern int inposext_ecr_datetime(const uint32_t timeout, int32_t *secsSinceEpoch);

/*!
 * \brief Gets the sale limit of ECR.
 *
 * If the total amount of sale items after all discounts and additions exceeds the sale limit,
 * ECR won't allow adding the last sale item or addition to total amount.
 *
 * Depending on how the sale limit is exceeded, sale state will be either InposSaleLimitReachedWithLastItem or InposSaleLimitReachedWithAddedAmount.
 *
 * \param timeout Timeout value in milliseconds.
 * \param limit Valid pointer to a uint64_t instance. For a sale limit of, e.g., 900,00 TL \a limit will be set to 90000.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_add_sale_item(), inposext_set_sale_limit()
 */
extern int inposext_sale_limit(const uint32_t timeout, uint64_t *limit);

/*!
 * \brief Sets the sale limit of ECR.
 * \param limit For a sale limit of, e.g., 900,00 TL \a limit must be set to 90000.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_sale_limit()
 */
extern int inposext_set_sale_limit(const uint64_t limit);

/*!
 * \brief Blocks the keypad of the ECR for most of the ECR states.
 *
 * Keys are not blocked for users other than cashier and for some error states.
 * Also if an EFT-POS or meal card application is active, device keys are usable
 * even if they are blocked with this function.
 *
 * \return A value from the InposExtError enumeration.
 * \sa inposext_unblock_ecr_keys(), inposext_ecr_key_blocking_status()
 */
extern int inposext_block_ecr_keys();

/*!
 * \brief Unblocks the keypad of the ECR.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_block_ecr_keys(), inposext_ecr_key_blocking_status()
 */
extern int inposext_unblock_ecr_keys();

/*!
 * \brief Gets the blocking status of the ECR keypad.
 * \param timeout Timeout value in milliseconds.
 * \param blocked Valid pointer to a uint32_t instance.
 * \a blocked will be set to 0 if the keypad is not blocked, otherwise it will be set to a non-zero value.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_block_ecr_keys(), inposext_unblock_ecr_keys()
 */
extern int inposext_ecr_key_blocking_status(const uint32_t timeout, int32_t *blocked);

extern int inposext_set_invoice_types(const InvoiceType first, const InvoiceType second);
extern int inposext_invoice_types(const uint32_t timeout, InvoiceType *first, InvoiceType *second);

/*!
 * \brief Gets the error detail about the last error occurred.
 *
 * When a function returns an error, this function canbe used to retrieve a value that desribes the reson for the error.
 *
 * \note InposExtErrorDetail values are available only for certain InposExtError values. See the enum definition for supported InposExtError values.
 * When an unsupported error occurs, this function will return InposNoErrorDetail.
 *
 * \return A value from the InposExtErrorDetail enumeration.
 */
extern int inposext_error_detail();

extern int inposext_send_application_message(const uint32_t timeout, const int32_t applicationId, const char *data, const int32_t size);

extern void inposext_set_application_message_callback(ApplicationMessageCallback callbackFunction);

#ifdef __cplusplus
}
#endif

#endif // INPOSEXT

