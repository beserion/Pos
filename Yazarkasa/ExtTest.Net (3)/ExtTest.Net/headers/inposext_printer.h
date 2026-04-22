#ifndef INPOSEXT_PRINTER_H
#define INPOSEXT_PRINTER_H

#include "inposext_printer_types.h"

#ifdef __cplusplus
extern "C" {
#endif

/*!
 * \brief Sets the encoding of the text to be added using inposext_printer_add_text().
 *
 * \note This function must be called for each slip and it must be called before any text is added.
 *
 * \param encoding Name of the encoding. The following encodings can be used:
 * \li "UTF-8"
 * \li "UTF-16"
 * \li "UTF-32"
 * \li "Windows-1250" to "Windows-1258"
 * \li "ISO 8859-1" to "ISO 8859-10"
 * \li "ISO 8859-13" to "ISO 8859-16"
 *
 * \return A value from the InposExtError enumeration.
 */
extern int inposext_printer_set_encoding(const char* encoding);

/*!
 * \brief Adds a paragraph to slip contents.
 *
 * \note If the alignment is different than the previous text added, the previous text must end with a new line character ('\\n').
 * Otherwise previous text's alignment is change to current text's alignment.
 *
 * \warning A valid codec must have been set before using this function.
 *
 * \param data Null terminated string encoded with the encoding set using inposext_printer_set_encoding()
 * \param format Formatting parameters to be applied on the inserted text.
 * \return A value from the InposExtError enumeration.
 */
extern int inposext_printer_add_text(const char* data, const TextFormat *format);

/*!
 * \brief Adds justified text.
 * \param leftAligned
 * \param rightAligned
 * \param format Alignment member is discarded.
 * \return A value from the InposExtError enumeration.
 */
extern int inposext_printer_add_justified_text(const char* leftAligned, const char* rightAligned, const TextFormat *format);

/*!
 * \brief Adds empty lines.
 * \param lines Number of empty lines. Must be at most 20.
 * \return A value from the InposExtError enumeration.
 */
extern int inposext_printer_add_line_feed(unsigned int lines);

/*!
 * \brief Prints the contents on paper.
 * \note inposext_printer_set_encoding() function must be called for each slip and it must be called before any text is added.
 * \note Consider setting the timeout to a large value since it may take several seconds to print a slip.
 * \param timeout Timeout value in milliseconds.
 * \param printAfterSale If set to a non-zero value, slip will be printed after sale receipt/invoice slip and before merchant slip.
 * If the ECR state is not InposEcrSale or InposEcrSaleWithInvoice, then slip will be printed regardless of the \a printAfterSale parameter.
 * \return A value from the InposExtError enumeration.
 */
extern int inposext_print_slip(const uint32_t timeout, const uint8_t printAfterSale);

/*!
 * \brief Opens connection to external printer.
 *
 * If the ECR supports en external printer this and other external printer functions
 * can be used to control and use the external printer.
 *
 * \note Neither the ECR nor this library does any initialization,
 * status check, error detection or error recovery when using
 * the external printer except connection management.
 *
 * \warning It is library user's responsibility to handle any issues that may occur
 * during external printer usage and close the printer connection upon finishing printing tasks.
 * Failing to do so may prevent the ECR to function properly.
 *
 * \param timeout Timeout value in milliseconds.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_external_printer_close(), inposext_external_printer_write(), inposext_external_printer_read()
 */
extern int inposext_external_printer_open(const uint32_t timeout);

/*!
 * \brief Closes the slip printer connection.
 *
 * \warning It is library user's responsibility to handle any issues that may occur
 * during external printer usage and close the printer connection upon finishing printing tasks.
 * Failing to do so may prevent the ECR to function properly.
 *
 * \return A value from the InposExtError enumeration.
 * \sa inposext_external_printer_open(), inposext_external_printer_write(), inposext_external_printer_read()
 */
extern int inposext_external_printer_close();

/*!
 * \brief Sends data to the external printer.
 *
 * This function sends the binary data in the buffer
 * unmodified to the external printer.
 *
 * \note Library users should consider possible buffer
 * overflow or similar errors that may occur during either
 * transmitting from the ECR or receiving by the
 * external printer.
 *
 * \param timeout Timeout value in milliseconds.
 * \param buffer Pointer to valid ExternalPrinterBuffer instance. \a buffer->size must be non-zero.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_external_printer_open(), inposext_external_printer_close(), inposext_external_printer_read()
 */
extern int inposext_external_printer_write(const uint32_t timeout, const ExternalPrinterBuffer *buffer);

/*!
 * \brief Gets data sent to ECR from the external printer.
 *
 * This function can be used to receive data sent by the external printer.
 *
 * \param timeout Timeout value in milliseconds.
 * \param buffer Valid pointer to an ExternalPrinterBuffer instance. \a buffer->size must be non-zero
 * and set to the expected data size. \a buffer->size will be updated with the size of received data.
 * \return A value from the InposExtError enumeration.
 * \sa inposext_external_printer_open(), inposext_external_printer_close(), inposext_external_printer_write()
 */
extern int inposext_external_printer_read(const uint32_t timeout, ExternalPrinterBuffer *buffer);

#ifdef __cplusplus
}
#endif

#endif // INPOSEXT_PRINTER_H
